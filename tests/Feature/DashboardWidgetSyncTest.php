<?php

namespace Tests\Feature;

use App\Models\Dashboard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardWidgetSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_sync_widgets_and_removed_rows_are_deleted(): void
    {
        $user = User::factory()->create();
        $dashboard = Dashboard::create([
            'user_id' => $user->id,
            'name' => 'Overview',
            'slug' => 'overview-test',
            'description' => null,
            'is_default' => true,
            'is_shared' => false,
        ]);

        $w1 = $dashboard->widgets()->create([
            'widget_type' => 'kpi_card',
            'metric_key' => 'revenue',
            'title' => 'Revenue',
            'config_json' => [],
            'filters_json' => [],
            'layout_x' => 0,
            'layout_y' => 0,
            'layout_w' => 2,
            'layout_h' => 2,
            'sort_order' => 0,
        ]);

        $w2 = $dashboard->widgets()->create([
            'widget_type' => 'kpi_card',
            'metric_key' => 'cost',
            'title' => 'Cost',
            'config_json' => [],
            'filters_json' => [],
            'layout_x' => 2,
            'layout_y' => 0,
            'layout_w' => 2,
            'layout_h' => 2,
            'sort_order' => 1,
        ]);

        $payload = [
            'widgets' => [
                [
                    'id' => $w1->id,
                    'widget_type' => 'kpi_card',
                    'metric_key' => 'revenue',
                    'title' => 'Revenue',
                    'config_json' => [],
                    'filters_json' => [],
                    'layout_x' => 1,
                    'layout_y' => 2,
                    'layout_w' => 3,
                    'layout_h' => 3,
                    'sort_order' => 0,
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(
            route('dashboards.widgets.sync', $dashboard, absolute: false),
            $payload,
        );

        $response->assertRedirect(route('dashboards.show', $dashboard, absolute: false));

        $this->assertDatabaseMissing('dashboard_widgets', ['id' => $w2->id]);
        $this->assertDatabaseHas('dashboard_widgets', [
            'id' => $w1->id,
            'layout_x' => 1,
            'layout_y' => 2,
            'layout_w' => 3,
            'layout_h' => 3,
            'sort_order' => 0,
        ]);
    }

    public function test_other_user_cannot_sync_dashboard(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $dashboard = Dashboard::create([
            'user_id' => $owner->id,
            'name' => 'Mine',
            'slug' => 'mine',
            'description' => null,
            'is_default' => true,
            'is_shared' => false,
        ]);

        $widget = $dashboard->widgets()->create([
            'widget_type' => 'kpi_card',
            'metric_key' => 'revenue',
            'title' => 'Revenue',
            'config_json' => [],
            'filters_json' => [],
            'layout_x' => 0,
            'layout_y' => 0,
            'layout_w' => 2,
            'layout_h' => 2,
            'sort_order' => 0,
        ]);

        $payload = [
            'widgets' => [
                [
                    'id' => $widget->id,
                    'widget_type' => 'kpi_card',
                    'metric_key' => 'revenue',
                    'title' => 'Revenue',
                    'config_json' => [],
                    'filters_json' => [],
                    'layout_x' => 1,
                    'layout_y' => 1,
                    'layout_w' => 2,
                    'layout_h' => 2,
                    'sort_order' => 0,
                ],
            ],
        ];

        $response = $this->actingAs($intruder)->post(
            route('dashboards.widgets.sync', $dashboard, absolute: false),
            $payload,
        );

        $response->assertNotFound();
    }

    public function test_sync_can_create_new_widget_without_id(): void
    {
        $user = User::factory()->create();
        $dashboard = Dashboard::create([
            'user_id' => $user->id,
            'name' => 'Overview',
            'slug' => 'overview-new',
            'description' => null,
            'is_default' => true,
            'is_shared' => false,
        ]);

        $payload = [
            'widgets' => [
                [
                    'widget_type' => 'kpi_card',
                    'metric_key' => 'profit',
                    'title' => 'Profit',
                    'config_json' => [],
                    'filters_json' => [],
                    'layout_x' => 0,
                    'layout_y' => 0,
                    'layout_w' => 2,
                    'layout_h' => 2,
                    'sort_order' => 0,
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(
            route('dashboards.widgets.sync', $dashboard, absolute: false),
            $payload,
        );

        $response->assertRedirect(route('dashboards.show', $dashboard, absolute: false));
        $this->assertDatabaseHas('dashboard_widgets', [
            'dashboard_id' => $dashboard->id,
            'metric_key' => 'profit',
            'widget_type' => 'kpi_card',
        ]);
    }

    public function test_sync_can_create_widget_with_empty_metric_key(): void
    {
        $user = User::factory()->create();
        $dashboard = Dashboard::create([
            'user_id' => $user->id,
            'name' => 'Overview',
            'slug' => 'overview-draft',
            'description' => null,
            'is_default' => true,
            'is_shared' => false,
        ]);

        $payload = [
            'widgets' => [
                [
                    'widget_type' => 'line_chart',
                    'metric_key' => '',
                    'title' => null,
                    'config_json' => ['color' => '#6366f1'],
                    'filters_json' => [],
                    'layout_x' => 0,
                    'layout_y' => 0,
                    'layout_w' => 6,
                    'layout_h' => 3,
                    'sort_order' => 0,
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(
            route('dashboards.widgets.sync', $dashboard, absolute: false),
            $payload,
        );

        $response->assertRedirect(route('dashboards.show', $dashboard, absolute: false));
        $response->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('dashboard_widgets', [
            'dashboard_id' => $dashboard->id,
            'metric_key' => '',
            'widget_type' => 'line_chart',
        ]);
    }
}
