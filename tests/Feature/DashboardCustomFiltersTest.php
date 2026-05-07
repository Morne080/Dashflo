<?php

namespace Tests\Feature;

use App\DTO\FilterRequest;
use App\Enums\LeadStatus;
use App\Enums\LeadVertical;
use App\Models\Buyer;
use App\Models\Dashboard;
use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\Lead;
use App\Models\Supplier;
use App\Models\User;
use App\Services\MetricsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardCustomFiltersTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_show_echoes_normalized_custom_filters(): void
    {
        $user = User::factory()->create();
        $dashboard = Dashboard::ensureDefaultDashboard($user);

        $payload = json_encode([
            ['field' => 'utm_source', 'value' => 'google'],
        ]);

        $url = route('dashboards.show', $dashboard, false).'?'.http_build_query([
            'custom_filters' => $payload,
        ]);

        $this->actingAs($user)
            ->get($url)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('filters.custom_filters', [
                    ['field' => 'utm_source', 'value' => 'google', 'scope' => 'lead'],
                ])
                ->has('filterOptions.custom_filter_fields')
                ->has('filterOptions.custom_filter_field_labels')
                ->has('filterOptions.custom_filter_field_options'));
    }

    public function test_dashboard_show_strips_unknown_custom_filter_fields(): void
    {
        $user = User::factory()->create();
        $dashboard = Dashboard::ensureDefaultDashboard($user);

        $payload = json_encode([
            ['field' => 'not_a_real_column', 'value' => 'x'],
            ['field' => 'disposition', 'value' => 'sold'],
        ]);

        $url = route('dashboards.show', $dashboard, false).'?'.http_build_query([
            'custom_filters' => $payload,
        ]);

        $this->actingAs($user)
            ->get($url)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('filters.custom_filters', [
                    ['field' => 'disposition', 'value' => 'sold', 'scope' => 'lead'],
                ]));
    }

    public function test_dashboard_includes_distinct_values_for_integration_dimension_fields(): void
    {
        $user = User::factory()->create();
        $dashboard = Dashboard::ensureDefaultDashboard($user);
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'e1',
            'occurred_at' => null,
            'dimensions' => ['accident_state' => 'TX'],
            'measures' => [],
        ]);
        IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'e2',
            'occurred_at' => null,
            'dimensions' => ['accident_state' => 'NY'],
            'measures' => [],
        ]);

        $this->actingAs($user)
            ->get(route('dashboards.show', $dashboard))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('filterOptions.custom_filter_field_options.accident_state', ['NY', 'TX']));
    }

    public function test_integration_fact_dimension_filter_limits_metrics(): void
    {
        $user = User::factory()->create();

        $supplier = Supplier::query()->create([
            'supplier_code' => 'T1',
            'name' => 'Test Supplier',
            'default_lead_type' => 'MVA PI',
            'active' => true,
        ]);

        $buyer = Buyer::query()->create([
            'buyer_code' => 'B1',
            'vertical' => LeadVertical::MVA,
            'name' => 'Buyer',
            'active' => true,
        ]);

        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        Lead::query()->create([
            'external_id' => 'lead-match',
            'vertical' => LeadVertical::MVA,
            'state' => 'TX',
            'accident_date' => null,
            'accident_sol' => null,
            'treatment_time' => null,
            'injury_type' => null,
            'phone_verification' => null,
            'supplier_id' => $supplier->id,
            'source' => 'Google',
            'utm_source' => null,
            'lead_type' => 'MVA PI',
            'status' => LeadStatus::Sold,
            'disposition' => null,
            'cost' => 0,
            'revenue' => 10,
            'ipl' => 5,
            'is_conversion' => false,
            'buyer_id' => $buyer->id,
        ]);

        Lead::query()->create([
            'external_id' => 'lead-other',
            'vertical' => LeadVertical::MVA,
            'state' => 'TX',
            'accident_date' => null,
            'accident_sol' => null,
            'treatment_time' => null,
            'injury_type' => null,
            'phone_verification' => null,
            'supplier_id' => $supplier->id,
            'source' => 'Google',
            'utm_source' => null,
            'lead_type' => 'MVA PI',
            'status' => LeadStatus::Sold,
            'disposition' => null,
            'cost' => 0,
            'revenue' => 10,
            'ipl' => 5,
            'is_conversion' => false,
            'buyer_id' => $buyer->id,
        ]);

        IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'lead-match',
            'occurred_at' => null,
            'dimensions' => ['campaign' => 'spring'],
            'measures' => [],
        ]);

        $base = [
            'date_from' => now()->startOfMonth()->toDateString(),
            'date_to' => now()->endOfMonth()->toDateString(),
        ];

        $unfiltered = new MetricsService(FilterRequest::fromDashboardFilters($base, $user, $user->id));
        $this->assertSame(2, $unfiltered->getOverviewKpis()['total_leads']);

        $filtered = new MetricsService(FilterRequest::fromDashboardFilters([
            ...$base,
            'custom_filters' => [
                ['field' => 'campaign', 'value' => 'spring', 'scope' => 'fact'],
            ],
        ], $user, $user->id));

        $this->assertSame(1, $filtered->getOverviewKpis()['total_leads']);
    }
}
