/** Catalog row from `Registry::serializeMetrics()` / Inertia `availableMetrics`. */
export type AvailableMetricDefinition = {
    key: string;
    label: string;
    description: string;
    type: string;
    format: string;
    category: string;
    compatible_widgets: string[];
};

/** One field from `WidgetType::configSchema()` (drives the Appearance tab). */
export type WidgetConfigSchemaField = {
    name: string;
    label: string;
    /** PHP may emit `string` for free text; the UI maps that to a text input. */
    type: 'select' | 'boolean' | 'number' | 'color' | 'text' | 'string';
    options?: Array<string | number>;
    default?: unknown;
    help?: string;
};

/** Catalog row from `Registry::serializeWidgets()` / Inertia `availableWidgets`. */
export type AvailableWidgetDefinition = {
    key: string;
    label: string;
    icon: string;
    description: string;
    category: string;
    supported_metric_types: string[];
    default_config: Record<string, unknown>;
    config_schema: WidgetConfigSchemaField[];
    default_size: { w: number; h: number };
};
