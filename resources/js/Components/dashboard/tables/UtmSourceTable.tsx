import { DataTable } from '@/Components/dashboard/DataTable';
import { performanceHeatmaps } from '@/Components/dashboard/heatmapPresets';
import type { BreakdownRow } from '@/types/dashboard';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<BreakdownRow>[] = [
    {
        accessorKey: 'utm_source',
        header: 'UTM source',
        meta: { align: 'left' },
    },
    {
        accessorKey: 'total_leads',
        header: 'Leads',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'sold',
        header: 'Sold',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'returns',
        header: 'Returns',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'return_rate',
        header: 'Return %',
        meta: { format: 'percent', align: 'right' },
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

export function UtmSourceTable({
    data,
    totalRow,
}: {
    data: BreakdownRow[];
    totalRow?: Partial<BreakdownRow>;
}) {
    return (
        <DataTable
            caption="UTM source performance for the selected filters."
            columns={columns}
            data={data}
            totalRow={totalRow}
            heatmapColumns={performanceHeatmaps}
            maxHeight="280px"
        />
    );
}
