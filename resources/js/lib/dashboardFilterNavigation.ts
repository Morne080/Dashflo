import { filtersToQueryRecord, mergeDashboardFilters } from '@/lib/dashboardFilters';
import type { DashboardFilters } from '@/types/dashboard';
import { DASHBOARD_PARTIAL_RELOAD_KEYS } from '@/types/dashboard';
import { router } from '@inertiajs/react';

/** Partial reload dashboard with updated filters. */
export function visitDashboardWithFilters(dashboardId: number, next: DashboardFilters): void {
    router.get(route('dashboards.show', dashboardId), filtersToQueryRecord(next), {
        only: [...DASHBOARD_PARTIAL_RELOAD_KEYS],
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

export { mergeDashboardFilters };
