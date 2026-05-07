import { DataTable } from '@/Components/dashboard/DataTable';
import {
    convRateHeatmap,
    gpMarginHeatmap,
} from '@/Components/dashboard/heatmapPresets';
import type { DailyMetricRow } from '@/types/dashboard';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<DailyMetricRow>[] = [
    { accessorKey: 'date', header: 'Date', meta: { align: 'left' } },
    {
        accessorKey: 'total',
        header: 'Total',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'sold',
        header: 'Sold',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'unsold',
        header: 'Unsold',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'return_pct',
        header: 'Return %',
        meta: { format: 'percent', align: 'right' },
    },
    {
        accessorKey: 'dq',
        header: 'DQ',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'revenue',
        header: 'Revenue',
        meta: { format: 'currency', align: 'right' },
    },
    {
        accessorKey: 'cost',
        header: 'Cost',
        meta: { format: 'currency', align: 'right' },
    },
    {
        accessorKey: 'cpl',
        header: 'CPL',
        meta: { format: 'currency', align: 'right' },
    },
    {
        accessorKey: 'ipl',
        header: 'IPL',
        meta: { format: 'currency', align: 'right' },
    },
    {
        accessorKey: 'net_profit',
        header: 'Net profit',
        meta: { format: 'currency', align: 'right' },
    },
    {
        accessorKey: 'gp_margin',
        header: 'GP margin',
        meta: { format: 'percent', align: 'right' },
    },
    {
        accessorKey: 'conversions',
        header: 'Conv.',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'conv_rate',
        header: 'Conv. rate',
        meta: { format: 'percent', align: 'right' },
    },
];

const heatmaps = [convRateHeatmap, gpMarginHeatmap];

export function DailyMetricsTable({
    data,
    totalRow,
}: {
    data: DailyMetricRow[];
    totalRow?: Partial<DailyMetricRow>;
}) {
    return (
        <DataTable
            caption="Daily metrics by date for the selected filters."
            columns={columns}
            data={data}
            totalRow={totalRow}
            heatmapColumns={heatmaps}
            maxHeight="520px"
        />
    );
}
