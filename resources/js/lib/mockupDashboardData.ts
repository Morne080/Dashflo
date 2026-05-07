import type { DashboardFilters, DashboardWidgetPayload } from '@/types/dashboard';

export type MockupDashboardMeta = {
    id: number;
    name: string;
    slug: string;
    description: string;
    is_default: boolean;
};

export type MockupFilterChip = {
    label: string;
    value: string;
};

export type MockupDashboardData = {
    dashboard: MockupDashboardMeta;
    filters: DashboardFilters;
    filterChips: MockupFilterChip[];
    executiveWidgets: DashboardWidgetPayload[];
    showcaseWidgets: DashboardWidgetPayload[];
};

function kpiSparkline(values: number[]): Array<{ date: string; value: number; prev_value: number }> {
    return values.map((value, idx) => ({
        date: `2026-05-${String(idx + 1).padStart(2, '0')}`,
        value,
        prev_value: Math.round(value * 0.92),
    }));
}

const baseDashboard: MockupDashboardMeta = {
    id: 0,
    name: 'Static Mockup',
    slug: 'static-mockup',
    description: 'Static demo data only',
    is_default: false,
};

const baseFilters: DashboardFilters = {
    date_from: '2026-05-01',
    date_to: '2026-05-31',
    source: null,
    status: null,
    vertical: null,
    sol: null,
    state: null,
    supplier_code: null,
    buyer_code: null,
    custom_filters: [],
};

const executiveWidgets: DashboardWidgetPayload[] = [
    {
        id: 'kpi-revenue',
        widget_type: 'kpi_card',
        metric_key: 'net_revenue',
        title: 'Net revenue',
        metric_label: 'Net revenue',
        config_json: { format: 'currency' },
        filters_json: {},
        layout_x: 0,
        layout_y: 0,
        layout_w: 3,
        layout_h: 1,
        sort_order: 1,
        export_table: null,
        data: {
            value: 248920,
            format: 'currency',
            percentChange: 12.4,
            sparklineData: kpiSparkline([7400, 7800, 8200, 8000, 9100, 9800, 10100, 11200]),
        },
    },
    {
        id: 'kpi-profit',
        widget_type: 'kpi_card',
        metric_key: 'net_profit',
        title: 'Net profit',
        metric_label: 'Net profit',
        config_json: { format: 'currency' },
        filters_json: {},
        layout_x: 3,
        layout_y: 0,
        layout_w: 3,
        layout_h: 1,
        sort_order: 2,
        export_table: null,
        data: {
            value: 90540,
            format: 'currency',
            percentChange: 8.7,
            sparklineData: kpiSparkline([2800, 3200, 3000, 3600, 3900, 4100, 4250, 4600]),
        },
    },
    {
        id: 'kpi-conv',
        widget_type: 'kpi_card',
        metric_key: 'conv_rate',
        title: 'Conversion rate',
        metric_label: 'Conversion rate',
        config_json: { format: 'percent' },
        filters_json: {},
        layout_x: 6,
        layout_y: 0,
        layout_w: 3,
        layout_h: 1,
        sort_order: 3,
        export_table: null,
        data: {
            value: 0.287,
            format: 'percent',
            percentChange: 3.9,
            sparklineData: kpiSparkline([0.22, 0.24, 0.23, 0.25, 0.27, 0.28, 0.29, 0.287]),
        },
    },
    {
        id: 'kpi-cpl',
        widget_type: 'kpi_card',
        metric_key: 'cpl',
        title: 'Cost per lead',
        metric_label: 'Cost per lead',
        config_json: { format: 'currency' },
        filters_json: {},
        layout_x: 9,
        layout_y: 0,
        layout_w: 3,
        layout_h: 1,
        sort_order: 4,
        export_table: null,
        data: {
            value: 14.62,
            format: 'currency',
            percentChange: -4.1,
            sparklineData: kpiSparkline([18.2, 17.8, 17.2, 16.5, 15.7, 15.1, 14.8, 14.62]),
        },
    },
    {
        id: 'line-daily',
        widget_type: 'line_chart',
        metric_key: 'daily_revenue',
        title: 'Revenue trend',
        metric_label: 'Revenue trend',
        config_json: { color: 'var(--primary)', showGrid: true },
        filters_json: {},
        layout_x: 0,
        layout_y: 1,
        layout_w: 6,
        layout_h: 2,
        sort_order: 5,
        export_table: null,
        data: [
            { date: 'May 01', revenue: 7100 },
            { date: 'May 02', revenue: 8020 },
            { date: 'May 03', revenue: 7800 },
            { date: 'May 04', revenue: 8900 },
            { date: 'May 05', revenue: 9300 },
            { date: 'May 06', revenue: 9750 },
            { date: 'May 07', revenue: 10400 },
        ],
    },
    {
        id: 'bar-states',
        widget_type: 'bar_chart',
        metric_key: 'states_performance',
        title: 'Top states by revenue',
        metric_label: 'State performance',
        config_json: { color: 'var(--primary)', showGrid: true },
        filters_json: {},
        layout_x: 6,
        layout_y: 1,
        layout_w: 6,
        layout_h: 2,
        sort_order: 6,
        export_table: null,
        data: [
            { state: 'CA', revenue: 62000 },
            { state: 'TX', revenue: 49700 },
            { state: 'FL', revenue: 43150 },
            { state: 'NY', revenue: 38510 },
            { state: 'AZ', revenue: 29700 },
        ],
    },
    {
        id: 'table-buyers',
        widget_type: 'data_table',
        metric_key: 'buyers_performance',
        title: 'Buyer performance snapshot',
        metric_label: 'Buyer performance',
        config_json: { maxHeight: '320px' },
        filters_json: {},
        layout_x: 0,
        layout_y: 3,
        layout_w: 12,
        layout_h: 2,
        sort_order: 7,
        export_table: null,
        data: {
            rows: [
                { buyer_code: 'BUY-ATLAS', leads: 1240, sold: 367, conv_rate: 0.296, revenue: 70480, gp_margin: 0.31 },
                { buyer_code: 'BUY-SOUTH', leads: 980, sold: 255, conv_rate: 0.26, revenue: 51230, gp_margin: 0.27 },
                { buyer_code: 'BUY-WEST', leads: 840, sold: 208, conv_rate: 0.248, revenue: 44510, gp_margin: 0.24 },
                { buyer_code: 'BUY-MID', leads: 760, sold: 182, conv_rate: 0.239, revenue: 38720, gp_margin: 0.22 },
            ],
            totalRow: { buyer_code: 'Total', leads: 3820, sold: 1012, conv_rate: 0.265, revenue: 204940, gp_margin: 0.26 },
        },
    },
];

const showcaseWidgets: DashboardWidgetPayload[] = [
    {
        id: 'show-kpi-total-leads',
        widget_type: 'kpi_card',
        metric_key: 'total_leads',
        title: 'Total leads',
        metric_label: 'Total leads',
        config_json: { format: 'number' },
        filters_json: {},
        layout_x: 0,
        layout_y: 0,
        layout_w: 3,
        layout_h: 1,
        sort_order: 1,
        export_table: null,
        data: {
            value: 5842,
            format: 'number',
            percentChange: 6.1,
            sparklineData: kpiSparkline([670, 700, 720, 730, 745, 760, 770, 782]),
        },
    },
    {
        id: 'show-line',
        widget_type: 'line_chart',
        metric_key: 'daily_metrics',
        title: 'Line chart widget',
        metric_label: 'Daily metrics',
        config_json: { showGrid: true },
        filters_json: {},
        layout_x: 3,
        layout_y: 0,
        layout_w: 3,
        layout_h: 1,
        sort_order: 2,
        export_table: null,
        data: [
            { day: 'Mon', value: 98 },
            { day: 'Tue', value: 106 },
            { day: 'Wed', value: 101 },
            { day: 'Thu', value: 119 },
            { day: 'Fri', value: 124 },
        ],
    },
    {
        id: 'show-bar',
        widget_type: 'bar_chart',
        metric_key: 'source_breakdown',
        title: 'Bar chart widget',
        metric_label: 'Source breakdown',
        config_json: { showGrid: true },
        filters_json: {},
        layout_x: 6,
        layout_y: 0,
        layout_w: 3,
        layout_h: 1,
        sort_order: 3,
        export_table: null,
        data: [
            { source: 'Google', value: 1820 },
            { source: 'Meta', value: 1210 },
            { source: 'TikTok', value: 930 },
            { source: 'Organic', value: 610 },
        ],
    },
    {
        id: 'show-pie',
        widget_type: 'pie_chart',
        metric_key: 'disposition_breakdown',
        title: 'Pie chart widget',
        metric_label: 'Disposition breakdown',
        config_json: {
            colors: ['var(--primary)', '#22c55e', '#f59e0b', '#ef4444'],
        },
        filters_json: {},
        layout_x: 9,
        layout_y: 0,
        layout_w: 3,
        layout_h: 1,
        sort_order: 4,
        export_table: null,
        data: [
            { name: 'Sold', value: 52 },
            { name: 'Unsold', value: 22 },
            { name: 'Returned', value: 14 },
            { name: 'DQ', value: 12 },
        ],
    },
    {
        id: 'show-table',
        widget_type: 'data_table',
        metric_key: 'daily_metrics',
        title: 'Data table widget',
        metric_label: 'Daily metrics table',
        config_json: { maxHeight: '300px' },
        filters_json: {},
        layout_x: 0,
        layout_y: 1,
        layout_w: 12,
        layout_h: 2,
        sort_order: 5,
        export_table: null,
        data: {
            rows: [
                { date: '2026-05-01', leads: 182, sold: 44, conv_rate: 0.242, revenue: 8200 },
                { date: '2026-05-02', leads: 201, sold: 51, conv_rate: 0.254, revenue: 8910 },
                { date: '2026-05-03', leads: 194, sold: 48, conv_rate: 0.247, revenue: 8640 },
                { date: '2026-05-04', leads: 210, sold: 57, conv_rate: 0.271, revenue: 9540 },
            ],
            totalRow: { date: 'Total', leads: 787, sold: 200, conv_rate: 0.254, revenue: 35290 },
        },
    },
];

export const mockupDashboardData: MockupDashboardData = {
    dashboard: baseDashboard,
    filters: baseFilters,
    filterChips: [
        { label: 'Date range', value: 'May 1 - May 31, 2026' },
        { label: 'Vertical', value: 'Mass Tort' },
        { label: 'Source mix', value: 'Google, Meta, TikTok' },
        { label: 'Mode', value: 'Static demo data' },
    ],
    executiveWidgets,
    showcaseWidgets,
};
