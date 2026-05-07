import { DASHFLO_INHERIT_DASHBOARD_FILTERS } from '@/lib/dashboardWidgetFilters';
import type { AvailableWidgetDefinition } from '@/types/catalog';
import type { DashboardWidgetPayload } from '@/types/dashboard';

function maxLayoutBottom(widgets: Pick<DashboardWidgetPayload, 'layout_y' | 'layout_h'>[]): number {
    if (widgets.length === 0) {
        return 0;
    }
    return Math.max(...widgets.map((w) => w.layout_y + w.layout_h));
}

/**
 * Draft widget for the builder (client UUID id, empty metric until configured).
 */
export function buildPendingWidgetFromDefinition(
    definition: AvailableWidgetDefinition,
    currentWidgets: DashboardWidgetPayload[],
): DashboardWidgetPayload {
    const tempId = crypto.randomUUID();
    const bottom = maxLayoutBottom(currentWidgets);
    const { w, h } = definition.default_size;

    return {
        id: tempId,
        widget_type: definition.key,
        metric_key: '',
        title: null,
        metric_label: 'New widget',
        config_json: { ...definition.default_config },
        filters_json: { [DASHFLO_INHERIT_DASHBOARD_FILTERS]: true },
        layout_x: 0,
        layout_y: bottom,
        layout_w: w,
        layout_h: h,
        sort_order: currentWidgets.length,
        data: {},
        export_table: null,
    };
}
