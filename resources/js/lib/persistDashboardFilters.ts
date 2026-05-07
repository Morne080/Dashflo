import type { DashboardFilters } from '@/types/dashboard';
import axios from 'axios';

/** Matches backend {@see PersistDashboardFiltersRequest} `filters` payload. */
export function filtersToPersistPayload(f: DashboardFilters): Record<string, unknown> {
    return {
        date_from: f.date_from,
        date_to: f.date_to,
        source: f.source,
        status: f.status,
        vertical: f.vertical,
        sol: f.sol,
        state: f.state,
        supplier_code: f.supplier_code,
        buyer_code: f.buyer_code,
        custom_filters: f.custom_filters ?? [],
    };
}

/** Explicit save for dashboard toolbar filters. */
export async function persistDashboardFiltersNow(
    dashboardId: number,
    filters: DashboardFilters,
): Promise<void> {
    await axios.post(route('dashboards.filters.sync', dashboardId), {
        filters: filtersToPersistPayload(filters),
    });
}
