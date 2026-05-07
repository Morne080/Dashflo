import { DataTable } from '@/Components/dashboard/DataTable';
import { performanceHeatmaps } from '@/Components/dashboard/heatmapPresets';
import type { BreakdownRow } from '@/types/dashboard';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<BreakdownRow>[] = [
    {
        accessorKey: 'injury_type',
        header: 'Injury type',
        meta: { align: 'left' },
    },
    {
        accessorKey: 'record_count',
        header: 'Records',
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
    {
        accessorKey: 'gp_margin',
        header: 'GP margin',
        meta: { format: 'percent', align: 'right' },
    },
];

export function InjuryTypeTable({
    data,
    totalRow,
}: {
    data: BreakdownRow[];
    totalRow?: Partial<BreakdownRow>;
}) {
    return (
        <DataTable
            caption="Injury type breakdown for the selected filters."
            columns={columns}
            data={data}
            totalRow={totalRow}
            heatmapColumns={performanceHeatmaps}
            maxHeight="240px"
        />
    );
}
