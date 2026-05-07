import { DataTable } from '@/Components/dashboard/DataTable';
import { convRateHeatmaps } from '@/Components/dashboard/heatmapPresets';
import type { BreakdownRow } from '@/types/dashboard';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<BreakdownRow>[] = [
    {
        accessorKey: 'accident_sol',
        header: 'Accident (SOL)',
        meta: { align: 'left' },
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

export function AccidentDateTable({
    data,
    totalRow,
}: {
    data: BreakdownRow[];
    totalRow?: Partial<BreakdownRow>;
}) {
    return (
        <DataTable
            caption="Accident date (SOL) breakdown for the selected filters."
            columns={columns}
            data={data}
            totalRow={totalRow}
            heatmapColumns={convRateHeatmaps}
            maxHeight="220px"
        />
    );
}
