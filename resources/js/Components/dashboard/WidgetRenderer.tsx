import { DataTable } from '@/Components/dashboard/DataTable';
import {
    convRateHeatmap,
    gpMarginHeatmap,
    performanceHeatmaps,
} from '@/Components/dashboard/heatmapPresets';
import { MetricBarChart, MetricLineChart, MetricPieChart } from '@/Components/dashboard/MetricCharts';
import { KpiCard } from '@/Components/dashboard/KpiCard';
import { SectionHeader } from '@/Components/dashboard/SectionHeader';
import { TableExportButton } from '@/Components/dashboard/TableExportButton';
import type { HeatmapConfig } from '@/Components/dashboard/tableTypes';
import type { DashboardExportTable } from '@/Components/dashboard/TableExportButton';
import type { DashboardWidgetPayload } from '@/types/dashboard';
import type { ColumnDef } from '@tanstack/react-table';

const SECTION_RIGHT = 'MTD PERFORMANCE';

const TABLE_SECTION_TITLES: Record<string, string> = {
    daily_metrics: 'Daily metrics',
    buyers_performance: 'Buyers performance',
    suppliers_performance: 'Suppliers performance',
    states_performance: 'States performance',
    disposition_report: 'Disposition report',
    injury_type: 'Injury type',
    accident_date: 'Accident date (SOL)',
    treatment_time: 'Treatment time',
    phone_verification: 'Phone verification',
    utm_source: 'UTM source',
    source_breakdown: 'Source breakdown',
    integration_source_table: 'Integration data',
};

const TABLE_MAX_HEIGHT: Record<string, string> = {
    daily_metrics: '520px',
    buyers_performance: '360px',
    suppliers_performance: '360px',
    states_performance: '480px',
    disposition_report: '320px',
    injury_type: '240px',
    accident_date: '220px',
    treatment_time: '220px',
    phone_verification: '260px',
    utm_source: '280px',
    integration_source_table: '480px',
};

const HEADER_LABELS: Record<string, string> = {
    buyer_code: 'Buyer',
    supplier_code: 'Supplier',
    vertical: 'Vertical',
    lead_type: 'Lead type',
    buyer_id: 'Buyer ID',
    supplier_id: 'Supplier ID',
    return_pct: 'Return %',
    conv_rate: 'Conv. rate',
    gp_margin: 'GP margin',
    accident_sol: 'Accident SOL',
    injury_type: 'Injury type',
    disposition: 'Disposition',
    treatment_bucket: 'Treatment time',
    phone_bucket: 'Verification',
    utm_source: 'UTM source',
    state: 'State',
    date: 'Date',
};

function tableSectionTitle(widget: DashboardWidgetPayload): string {
    const t = widget.title?.trim();
    if (t) {
        return t;
    }
    return TABLE_SECTION_TITLES[widget.metric_key] ?? humanizeKey(widget.metric_key);
}

function humanizeKey(key: string): string {
    return key
        .split('_')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function inferColumnFormat(key: string): 'currency' | 'number' | 'percent' | undefined {
    if (key === 'gp_margin' || key === 'conv_rate' || key.includes('_pct') || key.endsWith('_rate')) {
        return 'percent';
    }
    if (
        key.includes('revenue') ||
        key.includes('profit') ||
        key.includes('cost') ||
        key === 'cpl' ||
        (key.includes('margin') && key !== 'gp_margin')
    ) {
        return 'currency';
    }
    if (
        key.endsWith('_id') ||
        key === 'total' ||
        key === 'sold' ||
        key === 'unsold' ||
        key === 'dq' ||
        key === 'leads' ||
        key.includes('count')
    ) {
        return 'number';
    }
    return undefined;
}

function columnHeader(accessorKey: string): string {
    return HEADER_LABELS[accessorKey] ?? humanizeKey(accessorKey);
}

function inferColumns(
    sample: Record<string, unknown> | undefined,
    widget: DashboardWidgetPayload,
): ColumnDef<Record<string, unknown>>[] {
    if (!sample) {
        return [];
    }
    const headerOverrides =
        widget.config_json?.column_headers && typeof widget.config_json.column_headers === 'object'
            ? (widget.config_json.column_headers as Record<string, string>)
            : undefined;

    return Object.keys(sample).map((accessorKey) => {
        const format = inferColumnFormat(accessorKey);
        const align =
            format === 'currency' || format === 'number' || format === 'percent' ? 'right' : 'left';
        const header =
            headerOverrides?.[accessorKey] && headerOverrides[accessorKey].trim() !== ''
                ? headerOverrides[accessorKey]
                : columnHeader(accessorKey);
        return {
            accessorKey,
            header,
            meta: { format, align },
        };
    });
}

function heatmapsForMetric(metricKey: string): HeatmapConfig[] | undefined {
    if (metricKey === 'daily_metrics') {
        return [convRateHeatmap, gpMarginHeatmap];
    }
    if (metricKey === 'buyers_performance' || metricKey === 'suppliers_performance') {
        return performanceHeatmaps;
    }
    return undefined;
}

function maxHeightForMetric(metricKey: string, config: Record<string, unknown>): string | undefined {
    const fromConfig = config.maxHeight;
    if (typeof fromConfig === 'string' && fromConfig.trim() !== '') {
        return fromConfig;
    }
    return TABLE_MAX_HEIGHT[metricKey];
}

function isGroupedTablePayload(
    data: unknown,
): data is { rows: Record<string, unknown>[]; totalRow?: Record<string, unknown> | null } {
    if (data === null || typeof data !== 'object') {
        return false;
    }
    const rows = (data as { rows?: unknown }).rows;
    return Array.isArray(rows);
}

type KpiPayload = {
    value?: number;
    format?: 'currency' | 'number' | 'percent';
    percentChange?: number;
    sparklineData?: Array<{ date: string; value: number; prev_value: number }>;
};

export type WidgetRendererProps = {
    widget: DashboardWidgetPayload;
    data: unknown;
    isEditMode: boolean;
};

export function WidgetRenderer({ widget, data, isEditMode: _isEditMode }: WidgetRendererProps) {
    const cfg = widget.config_json;

    if (!widget.metric_key?.trim()) {
        return (
            <div className="flex h-full min-h-[120px] min-w-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/35 bg-muted/15 p-4 text-center">
                <p className="text-xs text-muted-foreground">Select a metric to load this widget.</p>
            </div>
        );
    }

    switch (widget.widget_type) {
        case 'kpi_card': {
            const d = data as KpiPayload;
            const label = widget.title?.trim() || widget.metric_label;
            const cfgFormat = cfg.format;
            const formatFromAppearance =
                cfgFormat === 'currency' || cfgFormat === 'number' || cfgFormat === 'percent'
                    ? cfgFormat
                    : null;
            const format = formatFromAppearance ?? d.format ?? 'currency';
            return (
                <div className="h-full min-h-0 min-w-0">
                    <KpiCard
                        label={label}
                        value={typeof d.value === 'number' && Number.isFinite(d.value) ? d.value : 0}
                        format={format}
                        percentChange={d.percentChange}
                        sparklineData={Array.isArray(d.sparklineData) ? d.sparklineData : []}
                    />
                </div>
            );
        }
        case 'data_table': {
            if (!isGroupedTablePayload(data)) {
                return (
                    <div className="rounded-md border border-border bg-card p-4 text-xs text-muted-foreground">
                        Invalid table payload for {widget.metric_label}.
                    </div>
                );
            }
            const { rows, totalRow } = data;
            const columns = inferColumns(rows[0], widget);
            const exportSlug = widget.export_table as DashboardExportTable | null;
            return (
                <div className="flex min-h-0 min-w-0 flex-col gap-3">
                    <SectionHeader
                        title={tableSectionTitle(widget)}
                        rightText={SECTION_RIGHT}
                        actions={
                            exportSlug ? <TableExportButton table={exportSlug} /> : undefined
                        }
                    />
                    <DataTable
                        columns={columns}
                        data={rows}
                        totalRow={totalRow ?? undefined}
                        heatmapColumns={heatmapsForMetric(widget.metric_key)}
                        maxHeight={maxHeightForMetric(widget.metric_key, cfg)}
                        caption={`${tableSectionTitle(widget)} for the selected filters.`}
                    />
                </div>
            );
        }
        case 'line_chart':
            return (
                <div className="flex min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {widget.title?.trim() || widget.metric_label}
                    </div>
                    <MetricLineChart data={data} config={cfg} />
                </div>
            );
        case 'bar_chart':
            return (
                <div className="flex min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {widget.title?.trim() || widget.metric_label}
                    </div>
                    <MetricBarChart data={data} config={cfg} />
                </div>
            );
        case 'pie_chart':
            return (
                <div className="flex min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {widget.title?.trim() || widget.metric_label}
                    </div>
                    <MetricPieChart data={data} config={cfg} />
                </div>
            );
        default:
            return (
                <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                    Unsupported widget type: {widget.widget_type}
                </div>
            );
    }
}
