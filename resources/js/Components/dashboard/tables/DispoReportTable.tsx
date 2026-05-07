import { DataTable } from '@/Components/dashboard/DataTable';
import type { BreakdownRow } from '@/types/dashboard';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<BreakdownRow>[] = [
    {
        accessorKey: 'feedback',
        header: 'Disposition',
        meta: { align: 'left' },
    },
    {
        accessorKey: 'leads',
        header: 'Leads',
        meta: { format: 'number', align: 'right' },
    },
    {
        accessorKey: 'returns',
        header: 'Returns',
        meta: { format: 'number', align: 'right' },
    },
];

export function DispoReportTable({
    data,
    totalRow,
}: {
    data: BreakdownRow[];
    totalRow?: Partial<BreakdownRow>;
}) {
    return (
        <DataTable
            caption="Disposition report for the selected filters."
            columns={columns}
            data={data}
            totalRow={totalRow}
            maxHeight="320px"
        />
    );
}
