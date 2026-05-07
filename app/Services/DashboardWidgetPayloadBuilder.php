<?php

namespace App\Services;

use App\Dashboards\Registry;
use App\DTO\FilterRequest;
use App\Models\Dashboard;
use App\Models\DashboardWidget;
use Illuminate\Http\Request;

/**
 * Resolves persisted {@see DashboardWidget} rows into Inertia-ready payloads (metric + data).
 */
final class DashboardWidgetPayloadBuilder
{
    /** When true in `filters_json`, widget uses dashboard global filters only (no per-widget overrides). */
    public const INHERIT_DASHBOARD_FILTERS_KEY = '_dashflo_inherit_dashboard';

    /** @var array<string, string> */
    private const SPARKLINE_KEY_BY_METRIC = [
        'revenue' => 'revenue',
        'net_revenue' => 'net_revenue',
        'cost' => 'cost',
        'cpl' => 'cpl',
        'profit' => 'profit',
        'net_profit' => 'net_profit',
        'conv_rate' => 'conversions',
        'gp_margin' => 'profit',
        'total_leads' => 'total_leads',
        'sold' => 'sold',
    ];

    public function __construct(
        private readonly Registry $registry,
    ) {}

    /**
     * Preview payload for a single widget (same shape as Inertia `widgets[]` items).
     *
     * @param  array<string, mixed>  $widgetInput
     * @return array<string, mixed>
     */
    public function previewPayload(Request $request, array $widgetInput): array
    {
        $globalFilters = FilterRequest::fromRequest($request)->toArray();

        $widget = new DashboardWidget([
            'dashboard_id' => 0,
            'widget_type' => (string) ($widgetInput['widget_type'] ?? ''),
            'metric_key' => (string) ($widgetInput['metric_key'] ?? ''),
            'title' => $widgetInput['title'] ?? null,
            'config_json' => is_array($widgetInput['config_json'] ?? null) ? $widgetInput['config_json'] : [],
            'filters_json' => is_array($widgetInput['filters_json'] ?? null) ? $widgetInput['filters_json'] : [],
            'layout_x' => (int) ($widgetInput['layout_x'] ?? 0),
            'layout_y' => (int) ($widgetInput['layout_y'] ?? 0),
            'layout_w' => (int) ($widgetInput['layout_w'] ?? 1),
            'layout_h' => (int) ($widgetInput['layout_h'] ?? 1),
            'sort_order' => (int) ($widgetInput['sort_order'] ?? 0),
        ]);

        $rawId = $widgetInput['id'] ?? 0;
        $widget->id = is_numeric($rawId) ? (int) $rawId : 0;

        $out = $this->buildOne($widget, $globalFilters);
        if (array_key_exists('id', $widgetInput)) {
            $out['id'] = $widgetInput['id'];
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function build(Request $request, Dashboard $dashboard): array
    {
        $globalFilters = FilterRequest::fromRequest($request)->toArray();
        $out = [];

        foreach ($dashboard->widgets as $widget) {
            $out[] = $this->buildOne($widget, $globalFilters);
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $globalFilters
     * @return array<string, mixed>
     */
    private function buildOne(DashboardWidget $widget, array $globalFilters): array
    {
        /** @var array<string, mixed> $widgetFilters */
        $widgetFilters = is_array($widget->filters_json) ? $widget->filters_json : [];
        $mergedFilters = $this->mergedDashboardFilters($globalFilters, $widgetFilters);

        if ($widget->metric_key === null || $widget->metric_key === '') {
            return [
                'id' => $widget->id,
                'widget_type' => $widget->widget_type,
                'metric_key' => '',
                'title' => $widget->title,
                'metric_label' => 'New widget',
                'config_json' => is_array($widget->config_json) ? $widget->config_json : [],
                'filters_json' => $widgetFilters,
                'layout_x' => $widget->layout_x,
                'layout_y' => $widget->layout_y,
                'layout_w' => $widget->layout_w,
                'layout_h' => $widget->layout_h,
                'sort_order' => $widget->sort_order,
                'data' => [],
                'export_table' => null,
            ];
        }

        $metric = $this->registry->metric($widget->metric_key);
        $config = is_array($widget->config_json) ? $widget->config_json : [];
        $data = $metric->query($mergedFilters, null, null, $config);

        if ($widget->widget_type === 'kpi_card') {
            $data = $this->enrichKpiPayload($widget->metric_key, $data, $mergedFilters, $config);
        }

        if ($widget->widget_type === 'data_table') {
            $data = $this->shapeGroupedTablePayload($widget->metric_key, $data);
        }

        return [
            'id' => $widget->id,
            'widget_type' => $widget->widget_type,
            'metric_key' => $widget->metric_key,
            'title' => $widget->title,
            'metric_label' => $metric->label(),
            'config_json' => is_array($widget->config_json) ? $widget->config_json : [],
            'filters_json' => $widgetFilters,
            'layout_x' => $widget->layout_x,
            'layout_y' => $widget->layout_y,
            'layout_w' => $widget->layout_w,
            'layout_h' => $widget->layout_h,
            'sort_order' => $widget->sort_order,
            'data' => $data,
            'export_table' => $this->exportTableSlug($widget->metric_key),
        ];
    }

    /**
     * @param  array<string, mixed>  $scalarPayload
     * @param  array<string, mixed>  $mergedFilters
     * @param  array<string, mixed>  $widgetConfig  KPI appearance / {@see DashboardWidget::$config_json}
     * @return array<string, mixed>
     */
    private function enrichKpiPayload(string $metricKey, array $scalarPayload, array $mergedFilters, array $widgetConfig = []): array
    {
        $filters = FilterRequest::fromDashboardFilters($mergedFilters);
        $m = new MetricsService($filters);
        $overview = $m->getOverviewKpis();

        $value = (float) ($scalarPayload['value'] ?? 0);
        $pctKey = $metricKey.'_change_pct';
        $percentChange = (float) ($overview[$pctKey] ?? 0);

        $sparklineKey = self::SPARKLINE_KEY_BY_METRIC[$metricKey] ?? null;
        $sparklineData = $sparklineKey !== null ? $m->getSparklineSeries($sparklineKey) : [];

        $format = $this->resolveKpiDisplayFormat($metricKey, $widgetConfig);

        return [
            'value' => $value,
            'format' => $format,
            'percentChange' => $percentChange,
            'sparklineData' => $sparklineData,
        ];
    }

    /**
     * Appearance tab "Display format" overrides metric defaults (e.g. integration count as currency).
     *
     * @param  array<string, mixed>  $widgetConfig
     */
    private function resolveKpiDisplayFormat(string $metricKey, array $widgetConfig): string
    {
        $fromAppearance = $widgetConfig['format'] ?? null;
        if (is_string($fromAppearance)) {
            $allowed = ['currency', 'number', 'percent'];
            if (in_array($fromAppearance, $allowed, true)) {
                return $fromAppearance;
            }
        }

        return match ($metricKey) {
            'conv_rate', 'gp_margin' => 'percent',
            'total_leads', 'sold', 'integration_source_count' => 'number',
            default => 'currency',
        };
    }

    /**
     * @param  array<string, mixed>  $queryData
     * @return array<string, mixed>
     */
    private function shapeGroupedTablePayload(string $metricKey, array $queryData): array
    {
        $rows = $queryData['rows'] ?? [];

        if ($metricKey === 'buyers_performance') {
            return $this->splitBuyerGrand($rows);
        }

        if ($metricKey === 'suppliers_performance') {
            return $this->splitSupplierGrand($rows);
        }

        return ['rows' => $rows, 'totalRow' => null];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{rows: list<array<string, mixed>>, totalRow: array<string, mixed>|null}
     */
    private function splitBuyerGrand(array $rows): array
    {
        if ($rows === []) {
            return ['rows' => [], 'totalRow' => null];
        }

        $last = $rows[array_key_last($rows)];
        if (($last['buyer_code'] ?? null) === 'ALL' && ($last['vertical'] ?? null) === 'ALL') {
            return [
                'rows' => array_slice($rows, 0, -1),
                'totalRow' => $last,
            ];
        }

        return ['rows' => $rows, 'totalRow' => null];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{rows: list<array<string, mixed>>, totalRow: array<string, mixed>|null}
     */
    private function splitSupplierGrand(array $rows): array
    {
        if ($rows === []) {
            return ['rows' => [], 'totalRow' => null];
        }

        $last = $rows[array_key_last($rows)];
        if (($last['supplier_code'] ?? null) === 'TOTAL' && ($last['lead_type'] ?? null) === 'ALL') {
            return [
                'rows' => array_slice($rows, 0, -1),
                'totalRow' => $last,
            ];
        }

        return ['rows' => $rows, 'totalRow' => null];
    }

    /**
     * @param  array<string, mixed>  $globalFilters
     * @param  array<string, mixed>  $widgetFiltersRaw
     * @return array<string, mixed>
     */
    private function mergedDashboardFilters(array $globalFilters, array $widgetFiltersRaw): array
    {
        if (($widgetFiltersRaw[self::INHERIT_DASHBOARD_FILTERS_KEY] ?? false) === true) {
            return $globalFilters;
        }

        $patch = $widgetFiltersRaw;
        unset($patch[self::INHERIT_DASHBOARD_FILTERS_KEY]);

        return array_merge($globalFilters, $patch);
    }

    private function exportTableSlug(string $metricKey): ?string
    {
        return match ($metricKey) {
            'daily_metrics' => 'daily_metrics',
            'buyers_performance' => 'buyers_performance',
            'suppliers_performance' => 'suppliers_performance',
            'states_performance' => 'states_performance',
            'disposition_report' => 'disposition_report',
            'injury_type' => 'injury_type',
            'accident_date' => 'accident_date',
            'treatment_time' => 'treatment_time',
            'phone_verification' => 'phone_verification',
            'utm_source' => 'utm_source',
            'source_breakdown' => 'source_breakdown',
            default => null,
        };
    }
}
