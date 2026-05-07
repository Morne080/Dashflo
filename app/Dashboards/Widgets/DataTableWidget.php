<?php

namespace App\Dashboards\Widgets;

final class DataTableWidget extends WidgetType
{
    public function key(): string
    {
        return 'data_table';
    }

    public function label(): string
    {
        return 'Data table';
    }

    public function icon(): string
    {
        return 'Table';
    }

    public function description(): string
    {
        return 'Sortable grid with optional heatmap and totals row.';
    }

    public function category(): string
    {
        return 'table';
    }

    public function supportedMetricTypes(): array
    {
        return ['grouped', 'breakdown'];
    }

    public function defaultConfig(): array
    {
        return [
            'heatmapColumn' => '',
            'showTotals' => true,
            'pageSize' => 50,
        ];
    }

    public function configSchema(): array
    {
        return [
            [
                'name' => 'heatmapColumn',
                'label' => 'Heatmap column (accessor key)',
                'type' => 'string',
                'default' => '',
            ],
            [
                'name' => 'showTotals',
                'label' => 'Show totals row',
                'type' => 'boolean',
                'default' => true,
            ],
            [
                'name' => 'pageSize',
                'label' => 'Page size',
                'type' => 'number',
                'default' => 50,
            ],
        ];
    }

    public function defaultSize(): array
    {
        return ['w' => 12, 'h' => 4];
    }
}
