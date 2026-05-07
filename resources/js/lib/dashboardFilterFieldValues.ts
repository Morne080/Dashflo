import { isStandardFilterKey } from '@/lib/dashboardFilterStandardDimensions';
import type { DashboardFilterOptions } from '@/types/dashboard';

export function showTrafficSourceScope(column: string | null): boolean {
    if (!column || column === 'source') {
        return false;
    }
    return !isStandardFilterKey(column);
}

export function stringifyPicklistOptions(raw: readonly unknown[]): string[] {
    return raw.map((v) => String(v));
}

export function picklistIncludes(options: readonly string[], value: string): boolean {
    return options.some((o) => String(o) === String(value));
}

/** Distinct values shipped on the dashboard payload (see `LeadCustomFilters::customFilterFieldOptionsMap`). */
export function optionsFromFilterMap(column: string | null, filterOptions: DashboardFilterOptions): string[] | null {
    if (!column || isStandardFilterKey(column)) {
        return null;
    }
    const raw = filterOptions.custom_filter_field_options?.[column];
    if (!Array.isArray(raw) || raw.length === 0) {
        return null;
    }
    return stringifyPicklistOptions(raw);
}

/**
 * When true, load values from `dashboard.filter-column-values` (traffic-scoped lead columns, or fields with no static picklist).
 *
 * With a non-empty traffic scope, integration / lead columns always load via API so the dropdown reflects **that source**
 * (static maps from `custom_filter_field_options` are global and ignore traffic).
 */
export function shouldFetchRemoteFilterValues(
    column: string | null,
    trafficScope: string,
    filterOptions: DashboardFilterOptions,
): boolean {
    if (!column || isStandardFilterKey(column)) {
        return false;
    }
    const traffic = trafficScope.trim();
    if (traffic !== '' && showTrafficSourceScope(column)) {
        return true;
    }
    return optionsFromFilterMap(column, filterOptions) == null;
}
