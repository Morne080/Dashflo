<?php

namespace App\Dashboards\Widgets;

final class KpiCardWidget extends WidgetType
{
    public function key(): string
    {
        return 'kpi_card';
    }

    public function label(): string
    {
        return 'KPI card';
    }

    public function icon(): string
    {
        return 'Gauge';
    }

    public function description(): string
    {
        return 'Single headline metric with optional change and sparkline.';
    }

    public function category(): string
    {
        return 'scorecard';
    }

    public function supportedMetricTypes(): array
    {
        return ['scalar'];
    }

    public function defaultConfig(): array
    {
        return [
            'format' => 'currency',
            'compareToPrevious' => true,
            'showSparkline' => true,
        ];
    }

    public function configSchema(): array
    {
        return [
            [
                'name' => 'format',
                'label' => 'Display format',
                'type' => 'select',
                'options' => ['currency', 'number', 'percent'],
                'default' => 'currency',
            ],
            [
                'name' => 'compareToPrevious',
                'label' => 'Compare to previous period',
                'type' => 'boolean',
                'default' => true,
            ],
            [
                'name' => 'showSparkline',
                'label' => 'Show sparkline',
                'type' => 'boolean',
                'default' => true,
            ],
        ];
    }

    public function defaultSize(): array
    {
        return ['w' => 2, 'h' => 2];
    }
}
