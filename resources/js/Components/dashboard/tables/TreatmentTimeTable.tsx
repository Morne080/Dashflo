import { DataTable } from '@/Components/dashboard/DataTable';
import { convRateHeatmaps } from '@/Components/dashboard/heatmapPresets';
import type { BreakdownRow } from '@/types/dashboard';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<BreakdownRow>[] = [
    {
        accessorKey: 'treatment_time',
        header: 'Treatment time',
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

export function TreatmentTimeTable({
    data,
    totalRow,
}: {
    data: BreakdownRow[];
    totalRow?: Partial<BreakdownRow>;
}) {
    return (
        <DataTable
            caption="Treatment time breakdown for the selected filters."
            columns={columns}
            data={data}
            totalRow={totalRow}
            heatmapColumns={convRateHeatmaps}
            maxHeight="220px"
        />
    );
}
