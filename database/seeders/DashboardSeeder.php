<?php

namespace Database\Seeders;

use App\Models\Dashboard;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds a default "Overview" dashboard + widgets for the first user (layout ~12-col grid).
 */
class DashboardSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->orderBy('id')->first();
        if ($user === null) {
            return;
        }

        $dashboard = Dashboard::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'slug' => 'overview',
            ],
            [
                'name' => 'Overview',
                'description' => 'Default KPI and table layout matching the main dashboard.',
                'is_default' => true,
                'is_shared' => false,
            ],
        );

        Dashboard::query()
            ->where('user_id', $user->id)
            ->where('id', '!=', $dashboard->id)
            ->update(['is_default' => false]);

        $dashboard->widgets()->delete();

        $emptyConfig = [];
        $emptyFilters = [];

        $definitions = [
            // Row 0: six KPI cards (w=2 each)
            ['kpi_card', 'revenue', 'Revenue', 0, 0, 2, 2],
            ['kpi_card', 'net_revenue', 'Net revenue', 2, 0, 2, 2],
            ['kpi_card', 'cost', 'Cost', 4, 0, 2, 2],
            ['kpi_card', 'cpl', 'CPL', 6, 0, 2, 2],
            ['kpi_card', 'profit', 'Profit', 8, 0, 2, 2],
            ['kpi_card', 'net_profit', 'Net profit', 10, 0, 2, 2],
            // Daily metrics full width
            ['data_table', 'daily_metrics', null, 0, 2, 12, 4],
            // Buyers / suppliers
            ['data_table', 'buyers_performance', null, 0, 6, 6, 5],
            ['data_table', 'suppliers_performance', null, 6, 6, 6, 5],
            // States
            ['data_table', 'states_performance', null, 0, 11, 12, 4],
            // Bottom: dispo | stacked injury/accident/treatment | stacked phone/utm
            ['data_table', 'disposition_report', null, 0, 15, 4, 6],
            ['data_table', 'injury_type', null, 4, 15, 4, 2],
            ['data_table', 'accident_date', null, 4, 17, 4, 2],
            ['data_table', 'treatment_time', null, 4, 19, 4, 2],
            ['data_table', 'phone_verification', null, 8, 15, 4, 3],
            ['data_table', 'utm_source', null, 8, 18, 4, 3],
        ];

        foreach ($definitions as $order => [$type, $metric, $title, $x, $y, $w, $h]) {
            $dashboard->widgets()->create([
                'widget_type' => $type,
                'metric_key' => $metric,
                'title' => $title,
                'config_json' => $emptyConfig,
                'filters_json' => $emptyFilters,
                'layout_x' => $x,
                'layout_y' => $y,
                'layout_w' => $w,
                'layout_h' => $h,
                'sort_order' => $order,
            ]);
        }
    }
}
