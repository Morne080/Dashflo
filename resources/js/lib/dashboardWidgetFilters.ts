/** Mirrors `DashboardWidgetPayloadBuilder::INHERIT_DASHBOARD_FILTERS_KEY`. */
export const DASHFLO_INHERIT_DASHBOARD_FILTERS = '_dashflo_inherit_dashboard';

export function isInheritDashboardFilters(filtersJson: Record<string, unknown>): boolean {
    return filtersJson[DASHFLO_INHERIT_DASHBOARD_FILTERS] === true;
}

export function stripInheritKey(filtersJson: Record<string, unknown>): Record<string, unknown> {
    const next = { ...filtersJson };
    delete next[DASHFLO_INHERIT_DASHBOARD_FILTERS];

    return next;
}
