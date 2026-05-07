<?php

namespace App\Http\Controllers;

use App\DTO\FilterRequest;
use App\Http\Requests\PersistDashboardFiltersRequest;
use App\Http\Requests\StoreDashboardRequest;
use App\Http\Requests\UpdateDashboardRequest;
use App\Models\Dashboard;
use App\Models\User;
use App\Support\DashboardSavedFilters;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardsController extends Controller
{
    /**
     * List all dashboards for the signed-in user.
     */
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $dashboards = Dashboard::query()
            ->forUser($user)
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'description', 'is_default', 'updated_at']);

        return Inertia::render('Dashboards/Index', [
            'dashboards' => $dashboards,
        ]);
    }

    public function store(StoreDashboardRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        $dashboard = Dashboard::query()->create([
            'user_id' => $user->id,
            'name' => $validated['name'],
            'slug' => Dashboard::uniqueSlugForUser($user, $validated['name']),
            'description' => $validated['description'] ?? null,
            'is_default' => false,
            'is_shared' => false,
        ]);

        return redirect()->route('dashboards.show', $dashboard)
            ->with('success', 'Dashboard created.');
    }

    public function update(UpdateDashboardRequest $request, Dashboard $dashboard): RedirectResponse
    {
        $this->authorize('update', $dashboard);

        $validated = $request->validated();

        $dashboard->fill([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        if ($dashboard->isDirty('name')) {
            $dashboard->slug = Dashboard::uniqueSlugForUser($request->user(), $validated['name']);
        }

        $dashboard->save();

        return redirect()->back()->with('success', 'Dashboard updated.');
    }

    public function destroy(Request $request, Dashboard $dashboard): RedirectResponse
    {
        $this->authorize('delete', $dashboard);

        /** @var User $user */
        $user = $request->user();

        DB::transaction(function () use ($dashboard, $user): void {
            if ($dashboard->is_default) {
                $replacement = Dashboard::query()
                    ->forUser($user)
                    ->whereKeyNot($dashboard->id)
                    ->orderByDesc('updated_at')
                    ->first();

                if ($replacement !== null) {
                    $replacement->forceFill(['is_default' => true])->save();
                }
            }

            $dashboard->delete();
        });

        $next = Dashboard::query()->forUser($user)->orderByDesc('updated_at')->first();

        if ($next !== null) {
            return redirect()->route('dashboards.show', $next)
                ->with('success', 'Dashboard deleted.');
        }

        return redirect()->route('dashboards.index')
            ->with('success', 'Dashboard deleted.');
    }

    public function duplicate(Request $request, Dashboard $dashboard): RedirectResponse
    {
        $this->authorize('view', $dashboard);

        /** @var User $user */
        $user = $request->user();

        $copy = DB::transaction(function () use ($dashboard, $user): Dashboard {
            $name = $dashboard->name.' (copy)';
            $new = Dashboard::query()->create([
                'user_id' => $user->id,
                'name' => $name,
                'slug' => Dashboard::uniqueSlugForUser($user, $name),
                'description' => $dashboard->description,
                'filters_json' => $dashboard->filters_json,
                'is_default' => false,
                'is_shared' => false,
            ]);

            foreach ($dashboard->widgets()->orderBy('sort_order')->get() as $widget) {
                $new->widgets()->create([
                    'widget_type' => $widget->widget_type,
                    'metric_key' => $widget->metric_key,
                    'title' => $widget->title,
                    'config_json' => $widget->config_json ?? [],
                    'filters_json' => $widget->filters_json ?? [],
                    'layout_x' => $widget->layout_x,
                    'layout_y' => $widget->layout_y,
                    'layout_w' => $widget->layout_w,
                    'layout_h' => $widget->layout_h,
                    'sort_order' => $widget->sort_order,
                ]);
            }

            return $new;
        });

        return redirect()->route('dashboards.show', $copy)
            ->with('success', 'Dashboard duplicated.');
    }

    public function setDefault(Request $request, Dashboard $dashboard): RedirectResponse
    {
        $this->authorize('update', $dashboard);

        /** @var User $user */
        $user = $request->user();

        DB::transaction(function () use ($dashboard, $user): void {
            Dashboard::query()->forUser($user)->update(['is_default' => false]);
            $dashboard->forceFill(['is_default' => true])->save();
        });

        return redirect()->back()->with('success', 'Default dashboard updated.');
    }

    /**
     * Persist toolbar filters for this dashboard (same lifecycle idea as saving widgets).
     */
    public function syncFilters(PersistDashboardFiltersRequest $request, Dashboard $dashboard): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $fr = FilterRequest::fromDashboardFilters($request->validated()['filters'], $user, $user->id);
        $dashboard->filters_json = $fr->toResponseArray();
        $dashboard->save();

        return response()->json(['ok' => true]);
    }

    /**
     * Reset saved filters to the default reporting window (current calendar month) with no drill-ins.
     */
    public function resetFilters(Request $request, Dashboard $dashboard): RedirectResponse
    {
        $this->authorize('update', $dashboard);

        /** @var User $user */
        $user = $request->user();

        $fr = FilterRequest::fromDashboardFilters([
            'date_from' => null,
            'date_to' => null,
            'source' => null,
            'status' => null,
            'vertical' => null,
            'sol' => null,
            'state' => null,
            'supplier_code' => null,
            'buyer_code' => null,
            'custom_filters' => [],
        ], $user, $user->id);

        $dashboard->filters_json = $fr->toResponseArray();
        $dashboard->save();

        return redirect()->to(DashboardSavedFilters::showUrlWithFiltersQuery($dashboard, $fr->toResponseArray()));
    }
}
