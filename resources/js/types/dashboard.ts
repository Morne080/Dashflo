import type { PageProps } from '@/types';

/** Catalog entry for “Add filter” (lead columns + keys seen on integration facts). */
export type CustomFilterFieldCatalogRow = {
    key: string;
    label: string;
    scope: 'lead' | 'fact';
};

/** Extra equality filters: `leads.*` columns and/or integration `dimensions` JSON (matched via external_id). */
export type CustomFilterRow = {
    field: string;
    value: string;
    /** `fact` = integration fact dimension; omitted/`lead` = lead table column. */
    scope?: 'lead' | 'fact';
};

/** Query + response filter shape (matches `FilterRequest::toResponseArray()`). */
export type DashboardFilters = {
    date_from: string;
    date_to: string;
    source: string | null;
    status: string | null;
    vertical: string | null;
    sol: string | null;
    state: string | null;
    supplier_code: string | null;
    buyer_code: string | null;
    /** Additional filters (lead columns and/or integration dimension keys). */
    custom_filters: CustomFilterRow[];
};

export type DashboardFilterOptions = {
    sources: string[];
    statuses: string[];
    verticals: string[];
    states: string[];
    accident_sols: string[];
    supplier_codes: string[];
    buyer_codes: string[];
    /** `field` => label (includes dynamic keys from integration sources). */
    custom_filter_field_labels: Record<string, string>;
    /** Optional: explicit field list + scope (preferred over labels-only). */
    custom_filter_fields?: CustomFilterFieldCatalogRow[];
    /** Optional picklists for custom filters (e.g. traffic / UTM values from data). */
    custom_filter_field_options?: Record<string, string[]>;
};

export type DailyMetricRow = Record<string, string | number>;

export type PerformanceRow = Record<string, string | number | null>;

export type BreakdownRow = Record<string, string | number>;

export type SparklinePoint = {
    date: string;
    value: number;
    prev_value: number;
};

/** Persisted widget + resolved metric payload from `DashboardWidgetPayloadBuilder`. */
export type DashboardWidgetPayload = {
    /** Integer DB id, or a client UUID string while unsaved. */
    id: number | string;
    widget_type: string;
    metric_key: string;
    title: string | null;
    metric_label: string;
    config_json: Record<string, unknown>;
    filters_json: Record<string, unknown>;
    layout_x: number;
    layout_y: number;
    layout_w: number;
    layout_h: number;
    sort_order: number;
    data: unknown;
    export_table: string | null;
};

/** Lightweight row for dashboard switcher / lists. */
export type DashboardSummaryRow = {
    id: number;
    name: string;
    is_default: boolean;
};

/** Integration sources listed for dashboard widget configuration. */
export type IntegrationSourceForWidget = {
    id: number;
    name: string;
    kind: string;
};

/** Inertia props returned by `DashboardController@show`. */
export type DashboardProps = {
    filters: DashboardFilters;
    filterOptions: DashboardFilterOptions;
    dashboard: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
        is_default: boolean;
    };
    /** All dashboards for the signed-in user (switcher). */
    dashboardSummaries: DashboardSummaryRow[];
    widgets: DashboardWidgetPayload[];
    /** For integration-backed widgets (source + column builder). */
    integration_sources_for_widgets: IntegrationSourceForWidget[];
};

/** Inertia props for `Dashboards/Index`. */
export type DashboardListItem = DashboardSummaryRow & {
    description: string | null;
    updated_at: string;
};

export type DashboardsIndexProps = {
    dashboards: DashboardListItem[];
};

/** Keys refetched on filter change (partial Inertia reload). */
export const DASHBOARD_PARTIAL_RELOAD_KEYS = [
    'filters',
    'filterOptions',
    'dashboard',
    'dashboardSummaries',
    'widgets',
    'integration_sources_for_widgets',
] as const;

export type DashboardPageProps = PageProps<DashboardProps>;
