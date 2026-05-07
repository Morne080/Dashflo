import type { PerformanceRow } from '@/types/dashboard';

function isBuyerGrandRow(row: PerformanceRow): boolean {
    return row.buyer_code === 'ALL' && row.vertical === 'ALL';
}

function isSupplierGrandRow(row: PerformanceRow): boolean {
    return row.supplier_code === 'TOTAL' && row.lead_type === 'ALL';
}

export function splitBuyerPerformanceRows(
    rows: PerformanceRow[],
): { data: PerformanceRow[]; totalRow?: Partial<PerformanceRow> } {
    if (rows.length === 0) {
        return { data: rows };
    }
    const last = rows[rows.length - 1];
    if (isBuyerGrandRow(last)) {
        return { data: rows.slice(0, -1), totalRow: last };
    }
    return { data: rows };
}

export function splitSupplierPerformanceRows(
    rows: PerformanceRow[],
): { data: PerformanceRow[]; totalRow?: Partial<PerformanceRow> } {
    if (rows.length === 0) {
        return { data: rows };
    }
    const last = rows[rows.length - 1];
    if (isSupplierGrandRow(last)) {
        return { data: rows.slice(0, -1), totalRow: last };
    }
    return { data: rows };
}
