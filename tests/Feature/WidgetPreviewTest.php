<?php

namespace Tests\Feature;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use App\Services\DashboardWidgetPayloadBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WidgetPreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_preview_widget(): void
    {
        $response = $this->postJson(route('api.widget.preview'), [
            'widget' => [
                'widget_type' => 'kpi_card',
                'metric_key' => 'revenue',
                'title' => null,
                'config_json' => [],
                'filters_json' => [],
            ],
        ]);

        $response->assertUnauthorized();
    }

    public function test_verified_user_receives_preview_payload(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('api.widget.preview'), [
            'widget' => [
                'id' => 'client-uuid-preview',
                'widget_type' => 'kpi_card',
                'metric_key' => 'revenue',
                'title' => null,
                'config_json' => [],
                'filters_json' => [
                    DashboardWidgetPayloadBuilder::INHERIT_DASHBOARD_FILTERS_KEY => true,
                ],
                'layout_x' => 0,
                'layout_y' => 0,
                'layout_w' => 2,
                'layout_h' => 2,
                'sort_order' => 0,
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('preview.id', 'client-uuid-preview');
        $response->assertJsonPath('preview.widget_type', 'kpi_card');
        $response->assertJsonPath('preview.metric_key', 'revenue');
        $response->assertJsonStructure([
            'preview' => [
                'metric_label',
                'data',
                'config_json',
                'filters_json',
                'export_table',
            ],
        ]);
    }

    public function test_integration_source_table_preview_returns_rows(): void
    {
        $user = User::factory()->create();
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
            'external_id' => 'lead-1',
            'occurred_at' => now(),
            'dimensions' => ['city' => 'Denver'],
            'measures' => ['n' => 3],
        ]);

        $response = $this->actingAs($user)->postJson(route('api.widget.preview'), [
            'widget' => [
                'id' => 0,
                'widget_type' => 'data_table',
                'metric_key' => 'integration_source_table',
                'title' => 'Rows',
                'config_json' => [
                    'integration_source_id' => $source->id,
                    'columns' => [
                        ['path' => 'external_id', 'header' => 'External'],
                        ['path' => 'dimensions.city', 'header' => 'City'],
                    ],
                    'column_headers' => [
                        'external_id' => 'External',
                        'dimensions__city' => 'City',
                    ],
                ],
                'filters_json' => [
                    DashboardWidgetPayloadBuilder::INHERIT_DASHBOARD_FILTERS_KEY => true,
                ],
                'layout_x' => 0,
                'layout_y' => 0,
                'layout_w' => 12,
                'layout_h' => 4,
                'sort_order' => 0,
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('preview.data.rows.0.external_id', 'lead-1');
        $response->assertJsonPath('preview.data.rows.0.dimensions__city', 'Denver');
    }

    public function test_integration_source_count_preview_returns_scalar(): void
    {
        $user = User::factory()->create();
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
            'external_id' => 'a',
            'occurred_at' => now(),
            'dimensions' => [],
            'measures' => [],
        ]);

        $response = $this->actingAs($user)->postJson(route('api.widget.preview'), [
            'widget' => [
                'id' => 0,
                'widget_type' => 'kpi_card',
                'metric_key' => 'integration_source_count',
                'title' => 'Count',
                'config_json' => [
                    'integration_source_id' => $source->id,
                ],
                'filters_json' => [
                    DashboardWidgetPayloadBuilder::INHERIT_DASHBOARD_FILTERS_KEY => true,
                ],
                'layout_x' => 0,
                'layout_y' => 0,
                'layout_w' => 2,
                'layout_h' => 2,
                'sort_order' => 0,
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('preview.data.value', 1);
        $response->assertJsonPath('preview.data.format', 'number');
    }

    public function test_kpi_display_format_from_appearance_overrides_metric_default(): void
    {
        $user = User::factory()->create();
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
            'external_id' => 'a',
            'occurred_at' => now(),
            'dimensions' => [],
            'measures' => [],
        ]);

        $response = $this->actingAs($user)->postJson(route('api.widget.preview'), [
            'widget' => [
                'id' => 0,
                'widget_type' => 'kpi_card',
                'metric_key' => 'integration_source_count',
                'title' => 'Count',
                'config_json' => [
                    'integration_source_id' => $source->id,
                    'format' => 'currency',
                ],
                'filters_json' => [
                    DashboardWidgetPayloadBuilder::INHERIT_DASHBOARD_FILTERS_KEY => true,
                ],
                'layout_x' => 0,
                'layout_y' => 0,
                'layout_w' => 2,
                'layout_h' => 2,
                'sort_order' => 0,
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('preview.data.format', 'currency');
    }

    public function test_integration_source_count_preview_sum_measure(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Sum source',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'a',
            'occurred_at' => now(),
            'dimensions' => [],
            'measures' => ['amount' => 10],
        ]);
        IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'b',
            'occurred_at' => now(),
            'dimensions' => [],
            'measures' => ['amount' => 15],
        ]);

        $response = $this->actingAs($user)->postJson(route('api.widget.preview'), [
            'widget' => [
                'id' => 0,
                'widget_type' => 'kpi_card',
                'metric_key' => 'integration_source_count',
                'title' => 'Sum',
                'config_json' => [
                    'integration_source_id' => $source->id,
                    'integration_kpi_mode' => 'sum',
                    'integration_kpi_measure' => 'amount',
                ],
                'filters_json' => [
                    DashboardWidgetPayloadBuilder::INHERIT_DASHBOARD_FILTERS_KEY => true,
                ],
                'layout_x' => 0,
                'layout_y' => 0,
                'layout_w' => 2,
                'layout_h' => 2,
                'sort_order' => 0,
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('preview.data.value', 25);
    }
}
