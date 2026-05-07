<?php

namespace App\Dashboards\Widgets;

final class PieChartWidget extends WidgetType
{
    public function key(): string
    {
        return 'pie_chart';
    }

    public function label(): string
    {
        return 'Pie chart';
    }

    public function icon(): string
    {
        return 'PieChart';
    }

    public function description(): string
    {
        return 'Part-to-whole view of a breakdown metric.';
    }

    public function category(): string
    {
        return 'chart';
    }

    public function supportedMetricTypes(): array
    {
        return ['breakdown'];
    }

    public function defaultConfig(): array
    {
        return [
            'showLegend' => true,
            'showPercent' => true,
        ];
    }

    public function configSchema(): array
    {
        return [
            [
                'name' => 'showLegend',
                'label' => 'Show legend',
                'type' => 'boolean',
                'default' => true,
            ],
            [
                'name' => 'showPercent',
                'label' => 'Show percentage labels',
                'type' => 'boolean',
                'default' => true,
            ],
        ];
    }

    public function defaultSize(): array
    {
        return ['w' => 3, 'h' => 3];
    }
}
