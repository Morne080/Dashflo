import { DataTable } from '@/Components/dashboard/DataTable';
import { performanceHeatmaps } from '@/Components/dashboard/heatmapPresets';
import { splitSupplierPerformanceRows } from '@/Components/dashboard/splitPerformanceRows';
import type { PerformanceRow } from '@/types/dashboard';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

const columns: ColumnDef<PerformanceRow>[] = [
    {
        accessorKey: 'supplier_code',
        header: 'Supplier',
        meta: { align: 'left' },
    },
    {
        accessorKey: 'lead_type',
        header: 'Lead type',
        meta: { align: 'left' },
    },
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

export function SuppliersPerformanceTable({
    data,
    totalRow: totalRowProp,
}: {
    data: PerformanceRow[];
    totalRow?: Partial<PerformanceRow>;
}) {
    const { data: tableData, totalRow } = useMemo(() => {
        if (totalRowProp !== undefined) {
            return { data, totalRow: totalRowProp };
        }
        return splitSupplierPerformanceRows(data);
    }, [data, totalRowProp]);

    return (
        <DataTable
            caption="Supplier performance for the selected filters."
            columns={columns}
            data={tableData}
            totalRow={totalRow}
            heatmapColumns={performanceHeatmaps}
            maxHeight="360px"
        />
    );
}
