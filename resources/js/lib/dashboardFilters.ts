import type { DashboardFilters } from '@/types/dashboard';

/** Merge dashboard filter state (custom_filters replaced only when provided). */
export function mergeDashboardFilters(
    base: DashboardFilters,
    patch: Partial<DashboardFilters>,
): DashboardFilters {
    return {
        ...base,
        ...patch,
        custom_filters:
            patch.custom_filters !== undefined ? (patch.custom_filters ?? []) : (base.custom_filters ?? []),
    };
}

/** Build query params for dashboard URL / CSV export (matches `FilterRequest`). */
export function filtersToQueryRecord(f: DashboardFilters): Record<string, string> {
    const q: Record<string, string> = {
        date_from: f.date_from,
        date_to: f.date_to,
    };
    const optionalStringKeys = [
        'source',
        'status',
        'vertical',
        'sol',
        'state',
        'supplier_code',
        'buyer_code',
    ] as const;
    for (const key of optionalStringKeys) {
        const v = f[key];
        if (v != null && v !== '') {
            q[key] = v;
        }
    }
    const cf = f.custom_filters ?? [];
    if (cf.length > 0) {
        q.custom_filters = JSON.stringify(cf);
    }
    return q;
}

export function filtersToQueryString(f: DashboardFilters): string {
    return new URLSearchParams(filtersToQueryRecord(f)).toString();
}
