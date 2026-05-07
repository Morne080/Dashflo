import { cn } from '@/lib/utils';
import {
    formatCurrency,
    formatNumber,
    formatPercent,
} from '@/lib/format';
import type { HeatmapConfig } from '@/Components/dashboard/tableTypes';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type CellContext,
    type Column,
    type ColumnDef,
    type Header,
    type Row,
    type SortingState,
    type Table,
    useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

export type { HeatmapConfig } from '@/Components/dashboard/tableTypes';

export interface DataTableProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData[];
    totalRow?: Partial<TData>;
    heatmapColumns?: HeatmapConfig[];
    maxHeight?: string;
    emptyMessage?: string;
    /** Visually hidden caption for accessibility. */
    caption?: string;
    className?: string;
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const t = value.trim().toLowerCase();
        if (t === '' || t === 'null' || t === 'undefined' || t === 'nan') {
            return undefined;
        }
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function heatmapBackgroundClass(
    columnId: string,
    rawValue: unknown,
    heatmapColumns: HeatmapConfig[] | undefined,
): string | undefined {
    if (!heatmapColumns?.length) {
        return undefined;
    }
    const cfg = heatmapColumns.find((h) => h.column === columnId);
    if (!cfg) {
        return undefined;
    }
    const n = toNumber(rawValue);
    if (n === undefined) {
        return undefined;
    }
    const { thresholds } = cfg;
    if (thresholds.length === 0) {
        return undefined;
    }
    for (let i = 0; i < thresholds.length; i++) {
        const t = thresholds[i];
        const isLast = i === thresholds.length - 1;
        if (n >= t.min && (isLast ? n <= t.max : n < t.max)) {
            return t.bg;
        }
    }
    const last = thresholds[thresholds.length - 1];
    if (n > last.max) {
        return last.bg;
    }
    return undefined;
}

export function formatCellValue(
    value: unknown,
    format?: string,
): { text: string; className?: string } {
    if (
        value === null ||
        value === undefined ||
        value === '' ||
        value === 'null'
    ) {
        return { text: '—' };
    }

    if (format === 'currency') {
        const n = toNumber(value);
        if (n === undefined) {
            return { text: '—' };
        }
        return {
            text: formatCurrency(n),
            className: n < 0 ? 'text-red-400' : undefined,
        };
    }

    if (format === 'percent') {
        const n = toNumber(value);
        if (n === undefined) {
            return { text: '—' };
        }
        return { text: formatPercent(n) };
    }

    if (format === 'number') {
        const n = toNumber(value);
        if (n === undefined) {
            return { text: '—' };
        }
        return { text: formatNumber(n) };
    }

    if (typeof value === 'string') {
        const t = value.trim().toLowerCase();
        if (t === '' || t === 'null' || t === 'undefined' || t === 'nan') {
            return { text: '—' };
        }
        return { text: value };
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return { text: formatNumber(value) };
    }
    if (typeof value === 'boolean') {
        return { text: value ? 'Yes' : 'No' };
    }
    if (typeof value === 'object') {
        return { text: '—' };
    }
    return { text: '—' };
}

function cellAlignClass<TData, TValue>(column: Column<TData, TValue>) {
    const meta = column.columnDef.meta;
    if (meta?.align) {
        return meta.align === 'right' ? 'text-right' : 'text-left';
    }
    if (
        meta?.format === 'currency' ||
        meta?.format === 'number' ||
        meta?.format === 'percent'
    ) {
        return 'text-right';
    }
    return 'text-left';
}

function cellNumericClass<TData, TValue>(column: Column<TData, TValue>) {
    const f = column.columnDef.meta?.format;
    if (f === 'currency' || f === 'number' || f === 'percent') {
        return 'tabular-nums';
    }
    return '';
}

function getColumnId<TData, TValue>(column: Column<TData, TValue>): string {
    return column.id;
}

function getValueFromRow<TData>(
    row: Partial<TData> | TData,
    column: Column<TData, unknown>,
): unknown {
    const def = column.columnDef as ColumnDef<TData, unknown> & {
        accessorKey?: string;
        accessorFn?: (originalRow: TData, index: number) => unknown;
    };
    const key = def.accessorKey;
    if (key && typeof key === 'string') {
        return (row as Record<string, unknown>)[key];
    }
    if (typeof def.accessorFn === 'function') {
        return def.accessorFn(row as TData, 0);
    }
    return undefined;
}

function SortGlyph<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
    const sorted = header.column.getIsSorted();
    if (!header.column.getCanSort()) {
        return null;
    }
    if (sorted === 'desc') {
        return <ArrowDown className="ml-1 inline size-3 shrink-0 opacity-90" aria-hidden="true" />;
    }
    if (sorted === 'asc') {
        return <ArrowUp className="ml-1 inline size-3 shrink-0 opacity-90" aria-hidden="true" />;
    }
    return (
        <ChevronsUpDown className="ml-1 inline size-3 shrink-0 opacity-50" aria-hidden="true" />
    );
}

export function DataTable<TData>({
    columns,
    data,
    totalRow,
    heatmapColumns,
    maxHeight,
    emptyMessage = 'No data for selected filters',
    caption = 'Data table',
    className,
}: DataTableProps<TData>) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        defaultColumn: {
            cell: (info) => defaultTableCell(info),
        },
    });

    const leafCount = table.getAllLeafColumns().length;

    const scrollStyle = useMemo(
        () => (maxHeight ? { maxHeight } : undefined),
        [maxHeight],
    );

    const showEmptyState = data.length === 0;

    return (
        <div
            className={cn(
                'w-full overflow-x-auto rounded-md border border-border bg-card text-xs leading-tight text-foreground',
                maxHeight && 'overflow-y-auto',
                className,
            )}
            style={scrollStyle}
        >
            <table className="w-full border-collapse">
                <caption className="sr-only">{caption}</caption>
                <thead className="sticky top-0 z-20 shadow-[inset_0_-1px_0_0_var(--border)]">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id} className="bg-primary">
                            {headerGroup.headers.map((header) => {
                                const sorted = header.column.getIsSorted();
                                const ariaSort =
                                    sorted === 'asc'
                                        ? 'ascending'
                                        : sorted === 'desc'
                                          ? 'descending'
                                          : 'none';
                                return (
                                    <th
                                        key={header.id}
                                        scope="col"
                                        colSpan={header.colSpan}
                                        aria-sort={
                                            header.column.getCanSort()
                                                ? ariaSort
                                                : undefined
                                        }
                                        className={cn(
                                            'h-8 whitespace-nowrap px-2 py-0 text-xs font-semibold uppercase tracking-wide text-primary-foreground first:rounded-tl-md last:rounded-tr-md',
                                            cellAlignClass(header.column),
                                            header.column.getCanSort() &&
                                                'cursor-pointer select-none hover:bg-primary/90',
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <span className="inline-flex items-center">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext(),
                                                  )}
                                            <SortGlyph header={header} />
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {showEmptyState ? (
                        <tr className="border-b border-border">
                            <td
                                colSpan={leafCount}
                                className="h-32 px-4 py-10 text-center text-sm text-muted-foreground"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        table.getRowModel().rows.map((row) => (
                            <TableBodyRow
                                key={row.id}
                                row={row}
                                heatmapColumns={heatmapColumns}
                            />
                        ))
                    )}
                    {totalRow && !showEmptyState ? (
                        <TotalRow
                            table={table}
                            totalRow={totalRow}
                            heatmapColumns={heatmapColumns}
                        />
                    ) : null}
                </tbody>
            </table>
        </div>
    );
}

function TableBodyRow<TData>({
    row,
    heatmapColumns,
}: {
    row: Row<TData>;
    heatmapColumns: HeatmapConfig[] | undefined;
}) {
    return (
        <tr className="h-8 border-b border-border transition-colors hover:bg-muted/35">
            {row.getVisibleCells().map((cell) => {
                const columnId = getColumnId(cell.column);
                const heatClass = heatmapBackgroundClass(
                    columnId,
                    cell.getValue(),
                    heatmapColumns,
                );
                return (
                    <td
                        key={cell.id}
                        className={cn(
                            'h-8 max-w-[14rem] truncate px-2 py-0 align-middle text-xs',
                            cellAlignClass(cell.column),
                            cellNumericClass(cell.column),
                            heatClass,
                        )}
                    >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                );
            })}
        </tr>
    );
}

function TotalRow<TData>({
    table,
    totalRow,
    heatmapColumns,
}: {
    table: Table<TData>;
    totalRow: Partial<TData>;
    heatmapColumns: HeatmapConfig[] | undefined;
}) {
    const firstRow = table.getRowModel().rows[0];
    if (!firstRow) {
        return null;
    }

    return (
        <tr className="h-8 border-t-2 border-border bg-secondary/80 font-bold text-foreground transition-colors hover:bg-secondary">
            {firstRow.getVisibleCells().map((cell) => {
                const column = cell.column;
                const columnId = getColumnId(column);
                const raw = getValueFromRow(totalRow, column);
                const meta = column.columnDef.meta;
                const heatClass = heatmapBackgroundClass(columnId, raw, heatmapColumns);
                const { text, className: textClass } = formatCellValue(raw, meta?.format);
                return (
                    <td
                        key={cell.id}
                        className={cn(
                            'h-8 max-w-[14rem] truncate px-2 py-0 align-middle text-xs',
                            cellAlignClass(column),
                            cellNumericClass(column),
                            heatClass,
                        )}
                    >
                        <span className={cn(textClass)}>{text}</span>
                    </td>
                );
            })}
        </tr>
    );
}

/** Default cell: formatted by `meta.format`; override with custom `cell` on column def. */
export function defaultTableCell<TData, TValue>(
    info: CellContext<TData, TValue>,
): ReactNode {
    const meta = info.column.columnDef.meta;
    const { text, className } = formatCellValue(info.getValue(), meta?.format);
    return <span className={cn(className)}>{text}</span>;
}
