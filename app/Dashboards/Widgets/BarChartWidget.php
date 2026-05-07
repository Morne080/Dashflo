<?php

namespace App\Dashboards\Widgets;

final class BarChartWidget extends WidgetType
{
    public function key(): string
    {
        return 'bar_chart';
    }

    public function label(): string
    {
        return 'Bar chart';
    }

    public function icon(): string
    {
        return 'BarChart3';
    }

    public function description(): string
    {
        return 'Compare categories from grouped or breakdown metrics.';
    }

    public function category(): string
    {
        return 'chart';
    }

    public function supportedMetricTypes(): array
    {
        return ['grouped', 'breakdown'];
    }

    public function defaultConfig(): array
    {
        return [
            'orientation' => 'vertical',
            'color' => '#6366f1',
            'showDataLabels' => false,
        ];
    }

    public function configSchema(): array
    {
        return [
            [
                'name' => 'orientation',
                'label' => 'Orientation',
                'type' => 'select',
                'options' => ['vertical', 'horizontal'],
                'default' => 'vertical',
            ],
            [
                'name' => 'color',
                'label' => 'Bar color',
                'type' => 'color',
                'default' => '#6366f1',
            ],
            [
                'name' => 'showDataLabels',
                'label' => 'Show data labels',
                'type' => 'boolean',
                'default' => false,
            ],
        ];
    }

    public function defaultSize(): array
    {
        return ['w' => 4, 'h' => 3];
    }
}
