<?php

namespace App\Dashboards\Widgets;

final class LineChartWidget extends WidgetType
{
    public function key(): string
    {
        return 'line_chart';
    }

    public function label(): string
    {
        return 'Line chart';
    }

    public function icon(): string
    {
        return 'LineChart';
    }

    public function description(): string
    {
        return 'Time series as a line or area chart.';
    }

    public function category(): string
    {
        return 'chart';
    }

    public function supportedMetricTypes(): array
    {
        return ['timeseries'];
    }

    public function defaultConfig(): array
    {
        return [
            'color' => '#6366f1',
            'showGrid' => false,
            'showLegend' => false,
            'smoothing' => false,
        ];
    }

    public function configSchema(): array
    {
        return [
            [
                'name' => 'color',
                'label' => 'Series color',
                'type' => 'color',
                'default' => '#6366f1',
            ],
            [
                'name' => 'showGrid',
                'label' => 'Show grid',
                'type' => 'boolean',
                'default' => false,
            ],
            [
                'name' => 'showLegend',
                'label' => 'Show legend',
                'type' => 'boolean',
                'default' => false,
            ],
            [
                'name' => 'smoothing',
                'label' => 'Smooth line',
                'type' => 'boolean',
                'default' => false,
            ],
        ];
    }

    public function defaultSize(): array
    {
        return ['w' => 6, 'h' => 3];
    }
}
