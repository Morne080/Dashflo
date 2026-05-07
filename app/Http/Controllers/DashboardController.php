<?php

namespace App\Http\Controllers;

use App\DTO\FilterRequest;
use App\Models\Dashboard;
use App\Models\IntegrationSource;
use App\Models\User;
use App\Services\DashboardWidgetPayloadBuilder;
use App\Support\DashboardSavedFilters;
use App\Support\LeadCustomFilters;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Inertia dashboard: persisted {@see Dashboard} widgets + {@see DashboardWidgetPayloadBuilder}.
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardWidgetPayloadBuilder $widgetPayloadBuilder,
    ) {}

    /**
     * Home: redirect to the user's default (or first) dashboard view.
     */
    public function home(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $dashboard = Dashboard::ensureDefaultDashboard($user);

        return redirect()->route('dashboards.show', $dashboard);
    }

    /**
     * Analytics canvas for a single dashboard (`Dashboard.tsx`).
     */
    public function show(Request $request, Dashboard $dashboard): SymfonyResponse|InertiaResponse
    {
        $this->authorize('view', $dashboard);

        /** @var User $user */
        $user = $request->user();

        $dashboard->load(['widgets' => fn ($q) => $q->orderBy('sort_order')]);

        if (count($request->query()) === 0 && DashboardSavedFilters::hasPersistedFilters($dashboard)) {
            /** @var array<string, mixed> $saved */
            $saved = $dashboard->filters_json ?? [];

            return redirect()->to(DashboardSavedFilters::showUrlWithFiltersQuery($dashboard, $saved));
        }

        $filters = FilterRequest::fromRequest($request);
        $widgets = $this->widgetPayloadBuilder->build($request, $dashboard);

        $dashboardSummaries = Dashboard::query()
            ->forUser($user)
            ->orderBy('name')
            ->get(['id', 'name', 'is_default']);

        $integrationSourcesForWidgets = IntegrationSource::query()
            ->where('user_id', $user->id)
            ->orderBy('name')
            ->get(['id', 'name', 'kind'])
            ->map(fn (IntegrationSource $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'kind' => $s->kind,
            ])
            ->all();

        return Inertia::render('Dashboard', [
            'filters' => $filters->toResponseArray(),
            'filterOptions' => $this->filterOptions($user),
            'dashboard' => $dashboard->only(['id', 'name', 'slug', 'description', 'is_default']),
            'dashboardSummaries' => $dashboardSummaries,
            'widgets' => $widgets,
            'integration_sources_for_widgets' => $integrationSourcesForWidgets,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function filterOptions(User $user): array
    {
        $sources = DB::table('leads')->distinct()->whereNotNull('source')->orderBy('source')->pluck('source')->all();

        $catalog = LeadCustomFilters::customFilterFieldsCatalog($user);
        $customLabels = [];
        foreach ($catalog as $row) {
            $customLabels[$row['key']] = $row['label'];
        }

        return [
            'sources' => $sources,
            'statuses' => ['converted', 'dq', 'fake', 'returned', 'sold', 'unsold'],
            'verticals' => DB::table('leads')->distinct()->orderBy('vertical')->pluck('vertical')->all(),
            'states' => DB::table('leads')->distinct()->orderBy('state')->pluck('state')->all(),
            'accident_sols' => DB::table('leads')->whereNotNull('accident_sol')->distinct()->orderBy('accident_sol')->pluck('accident_sol')->all(),
            'supplier_codes' => DB::table('suppliers')->orderBy('supplier_code')->pluck('supplier_code')->all(),
            'buyer_codes' => DB::table('buyers')->orderBy('buyer_code')->pluck('buyer_code')->all(),
            'custom_filter_fields' => $catalog,
            'custom_filter_field_labels' => $customLabels,
            /** Distinct values per field for “Add filter” (lead columns + integration JSON dimensions). */
            'custom_filter_field_options' => LeadCustomFilters::customFilterFieldOptionsMap($user),
        ];
    }
}
