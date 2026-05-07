import { Link } from '@inertiajs/react';

const MAX_DYNAMIC_COLUMNS = 40;

export type FactsTableRow = {
    id: number;
    external_id: string | null;
    occurred_at: string | null;
    dimensions: Record<string, unknown>;
    measures: Record<string, unknown>;
    created_at: string | null;
    source_id?: number;
    source_name?: string | null;
};

type FieldColumn = { id: string; scope: 'dim' | 'meas'; key: string; header: string };

function formatCell(value: unknown): string {
    if (value === null || value === undefined) {
        return '—';
    }
    if (typeof value === 'string') {
        return value.length > 100 ? `${value.slice(0, 100)}…` : value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        const s = JSON.stringify(value);
        return s.length > 120 ? `${s.slice(0, 120)}…` : s;
    } catch {
        return '—';
    }
}

function collectFieldColumns(rows: FactsTableRow[]): { columns: FieldColumn[]; truncated: boolean } {
    const dimKeys = new Set<string>();
    const measKeys = new Set<string>();
    for (const row of rows) {
        for (const k of Object.keys(row.dimensions ?? {})) {
            dimKeys.add(k);
        }
        for (const k of Object.keys(row.measures ?? {})) {
            measKeys.add(k);
        }
    }
    const cols: FieldColumn[] = [];
    for (const key of Array.from(dimKeys).sort((a, b) => a.localeCompare(b))) {
        cols.push({ id: `dim:${key}`, scope: 'dim', key, header: `Dim · ${key}` });
    }
    for (const key of Array.from(measKeys).sort((a, b) => a.localeCompare(b))) {
        cols.push({ id: `meas:${key}`, scope: 'meas', key, header: `Meas · ${key}` });
    }
    if (cols.length <= MAX_DYNAMIC_COLUMNS) {
        return { columns: cols, truncated: false };
    }
    return { columns: cols.slice(0, MAX_DYNAMIC_COLUMNS), truncated: true };
}

function cellForColumn(row: FactsTableRow, col: FieldColumn): string {
    const bag = col.scope === 'dim' ? row.dimensions : row.measures;
    return formatCell(bag?.[col.key]);
}

export function IntegrationFactsDataTable({
    rows,
    showSourceColumn,
    linkSourceNames,
    formatWhen,
    emptyMessage,
}: {
    rows: FactsTableRow[];
    showSourceColumn?: boolean;
    linkSourceNames?: boolean;
    formatWhen: (iso: string | null | undefined) => string;
    emptyMessage: string;
}) {
    const { columns: fieldCols, truncated } = collectFieldColumns(rows);

    return (
        <>
            {truncated ? (
                <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Showing the first {MAX_DYNAMIC_COLUMNS} field columns on this page (dimensions first, then measures,
                    each sorted A–Z).
                </p>
            ) : null}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                            <th className="px-3 py-2">When</th>
                            {showSourceColumn ? <th className="px-3 py-2">Source</th> : null}
                            <th className="px-3 py-2">External id</th>
                            {fieldCols.map((c) => (
                                <th key={c.id} className="px-3 py-2 whitespace-nowrap normal-case">
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={2 + (showSourceColumn ? 1 : 0) + fieldCols.length}
                                    className="px-3 py-8 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id} className="border-b border-border last:border-0 align-top">
                                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                        {formatWhen(row.created_at)}
                                    </td>
                                    {showSourceColumn ? (
                                        <td className="px-3 py-2">
                                            {linkSourceNames &&
                                            row.source_id != null &&
                                            row.source_name != null &&
                                            row.source_name !== '' ? (
                                                <Link
                                                    href={route('integrations.index')}
                                                    className="text-primary underline-offset-4 hover:underline"
                                                >
                                                    {row.source_name}
                                                </Link>
                                            ) : (
                                                (row.source_name ?? '—')
                                            )}
                                        </td>
                                    ) : null}
                                    <td className="px-3 py-2 font-mono text-xs">{row.external_id ?? '—'}</td>
                                    {fieldCols.map((c) => (
                                        <td key={c.id} className="max-w-[14rem] px-3 py-2 text-xs text-foreground">
                                            <span className="break-words">{cellForColumn(row, c)}</span>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
