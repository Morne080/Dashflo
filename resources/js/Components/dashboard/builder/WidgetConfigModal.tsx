import { AppearanceConfigFields } from '@/Components/dashboard/builder/AppearanceConfigFields';
import { IntegrationSourceWidgetFields } from '@/Components/dashboard/builder/IntegrationSourceWidgetFields';
import { MetricCombobox } from '@/Components/dashboard/builder/MetricCombobox';
import {
    WidgetScopedFiltersForm,
    type WidgetConfigFormValues,
} from '@/Components/dashboard/builder/WidgetScopedFiltersForm';
import { WidgetRenderer } from '@/Components/dashboard/WidgetRenderer';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizeCustomFilterRows } from '@/lib/customFilters';
import {
    DASHFLO_INHERIT_DASHBOARD_FILTERS,
    isInheritDashboardFilters,
    stripInheritKey,
} from '@/lib/dashboardWidgetFilters';
import { postWidgetPreview } from '@/lib/postWidgetPreview';
import type { AvailableMetricDefinition, AvailableWidgetDefinition } from '@/types/catalog';
import type {
    DashboardFilterOptions,
    DashboardFilters,
    DashboardWidgetPayload,
    IntegrationSourceForWidget,
} from '@/types/dashboard';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';

const FILTER_KEYS: (keyof DashboardFilters)[] = [
    'date_from',
    'date_to',
    'source',
    'status',
    'vertical',
    'sol',
    'state',
    'supplier_code',
    'buyer_code',
];

function pickNullableString(raw: unknown, fallback: string | null): string | null {
    if (raw === undefined) {
        return fallback;
    }
    if (raw === null || raw === '') {
        return null;
    }

    return String(raw);
}

function mergedEffectiveFilters(global: DashboardFilters, patch: Record<string, unknown>): DashboardFilters {
    const patchHasCustom = Object.prototype.hasOwnProperty.call(patch, 'custom_filters');
    const custom_filters = patchHasCustom
        ? normalizeCustomFilterRows(patch.custom_filters)
        : (global.custom_filters ?? []);

    return {
        date_from:
            typeof patch.date_from === 'string' && patch.date_from.trim() !== ''
                ? patch.date_from
                : global.date_from,
        date_to:
            typeof patch.date_to === 'string' && patch.date_to.trim() !== '' ? patch.date_to : global.date_to,
        source: pickNullableString(patch.source, global.source),
        status: pickNullableString(patch.status, global.status),
        vertical: pickNullableString(patch.vertical, global.vertical),
        sol: pickNullableString(patch.sol, global.sol),
        state: pickNullableString(patch.state, global.state),
        supplier_code: pickNullableString(patch.supplier_code, global.supplier_code),
        buyer_code: pickNullableString(patch.buyer_code, global.buyer_code),
        custom_filters,
    };
}

function initialFilterState(
    globalFilters: DashboardFilters,
    filtersJson: Record<string, unknown>,
): Pick<WidgetConfigFormValues, 'inheritFilters' | 'filtersOverride'> {
    if (isInheritDashboardFilters(filtersJson)) {
        return { inheritFilters: true, filtersOverride: { ...globalFilters } };
    }

    const patch = stripInheritKey(filtersJson);

    return {
        inheritFilters: false,
        filtersOverride: mergedEffectiveFilters(globalFilters, patch),
    };
}

function stripIntegrationKeysFromConfig(cfg: Record<string, unknown>): Record<string, unknown> {
    const next = { ...cfg };
    delete next.integration_source_id;
    delete next.integration_kpi_mode;
    delete next.integration_kpi_measure;
    delete next.columns;
    delete next.column_headers;
    return next;
}

function buildFiltersJsonForSave(
    inherit: boolean,
    global: DashboardFilters,
    override: DashboardFilters,
): Record<string, unknown> {
    if (inherit) {
        return { [DASHFLO_INHERIT_DASHBOARD_FILTERS]: true };
    }

    const out: Record<string, unknown> = {};
    for (const k of FILTER_KEYS) {
        if (global[k] !== override[k]) {
            out[k] = override[k];
        }
    }

    const gCf = global.custom_filters ?? [];
    const oCf = override.custom_filters ?? [];
    if (JSON.stringify(gCf) !== JSON.stringify(oCf)) {
        out.custom_filters = oCf;
    }

    return out;
}

function buildPreviewRequestWidget(
    base: DashboardWidgetPayload,
    values: WidgetConfigFormValues,
    globalFilters: DashboardFilters,
): Record<string, unknown> {
    const filters_json = buildFiltersJsonForSave(values.inheritFilters, globalFilters, values.filtersOverride);

    return {
        id: base.id,
        widget_type: base.widget_type,
        metric_key: values.metric_key,
        title: values.title.trim() === '' ? null : values.title.trim(),
        config_json: values.config_json,
        filters_json,
        layout_x: base.layout_x,
        layout_y: base.layout_y,
        layout_w: base.layout_w,
        layout_h: base.layout_h,
        sort_order: base.sort_order,
    };
}

const formSchema = z.object({
    metric_key: z.string().min(1, 'Select a metric'),
    title: z.string(),
    inheritFilters: z.boolean(),
    filtersOverride: z.object({
        date_from: z.string(),
        date_to: z.string(),
        source: z.string().nullable(),
        status: z.string().nullable(),
        vertical: z.string().nullable(),
        sol: z.string().nullable(),
        state: z.string().nullable(),
        supplier_code: z.string().nullable(),
        buyer_code: z.string().nullable(),
        custom_filters: z.array(
            z.object({
                field: z.string(),
                value: z.string(),
                scope: z.enum(['lead', 'fact']).optional(),
            }),
        ),
    }),
    config_json: z.record(z.string(), z.unknown()),
});

const dataSectionClass =
    'rounded-lg border border-border/90 bg-card p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]';
const sectionEyebrowClass =
    'mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground';
const sectionTitleClass = 'text-sm font-semibold leading-tight text-foreground';
const sectionHintClass = 'mt-1.5 text-xs leading-relaxed text-muted-foreground';

export type WidgetConfigModalProps = {
    open: boolean;
    mode: 'create' | 'edit';
    widget: DashboardWidgetPayload | null;
    globalFilters: DashboardFilters;
    filterOptions: DashboardFilterOptions;
    availableMetrics: AvailableMetricDefinition[];
    availableWidgets: AvailableWidgetDefinition[];
    integrationSourcesForWidgets?: IntegrationSourceForWidget[];
    onSave: (widget: DashboardWidgetPayload) => void;
    onCancel: () => void;
};

export function WidgetConfigModal({
    open,
    mode,
    widget,
    globalFilters,
    filterOptions,
    availableMetrics,
    availableWidgets,
    integrationSourcesForWidgets = [],
    onSave,
    onCancel,
}: WidgetConfigModalProps): JSX.Element | null {
    const widgetTypeDef = useMemo(
        () => availableWidgets.find((w) => w.key === widget?.widget_type) ?? null,
        [availableWidgets, widget?.widget_type],
    );

    const metricsForType = useMemo(() => {
        if (!widgetTypeDef) {
            return [];
        }
        const allowed = new Set(widgetTypeDef.supported_metric_types);
        return availableMetrics.filter((m) => allowed.has(m.type));
    }, [availableMetrics, widgetTypeDef]);

    const metricsForPicker = useMemo(() => {
        let list = metricsForType;
        if (integrationSourcesForWidgets.length === 0) {
            list = list.filter(
                (m) => m.key !== 'integration_source_count' && m.key !== 'integration_source_table',
            );
        }
        return list;
    }, [metricsForType, integrationSourcesForWidgets]);

    const standardMetricsOnly = useMemo(
        () =>
            metricsForPicker.filter(
                (m) => m.key !== 'integration_source_count' && m.key !== 'integration_source_table',
            ),
        [metricsForPicker],
    );

    const form = useForm<WidgetConfigFormValues>({
        resolver: zodResolver(formSchema),
        mode: 'onSubmit',
        defaultValues: {
            metric_key: '',
            title: '',
            inheritFilters: true,
            filtersOverride: { ...globalFilters },
            config_json: {},
        },
    });

    const handleDataSourceChange = useCallback(
        (value: string) => {
            if (!widget || !widgetTypeDef) {
                return;
            }
            const currentCfg = (form.getValues('config_json') ?? {}) as Record<string, unknown>;
            const mergedDefaults = { ...widgetTypeDef.default_config, ...currentCfg };

            if (value === 'standard') {
                form.setValue('metric_key', '');
                form.setValue('config_json', stripIntegrationKeysFromConfig(mergedDefaults));
                return;
            }

            const rawId = value.startsWith('integration:') ? value.slice('integration:'.length) : value;
            const id = Number(rawId);
            if (!Number.isFinite(id) || id <= 0) {
                return;
            }

            const nextMetric =
                widget.widget_type === 'kpi_card' ? 'integration_source_count' : 'integration_source_table';
            const stripped = stripIntegrationKeysFromConfig(mergedDefaults);
            const nextConfig: Record<string, unknown> = {
                ...stripped,
                integration_source_id: id,
                ...(widget.widget_type === 'data_table'
                    ? { columns: [], column_headers: {} }
                    : { integration_kpi_mode: 'rows', integration_kpi_measure: '' }),
            };

            form.setValue('metric_key', nextMetric);
            form.setValue('config_json', nextConfig);
        },
        [widget, widgetTypeDef, form],
    );

    const previewAbortRef = useRef<AbortController | null>(null);
    const [previewPayload, setPreviewPayload] = useState<DashboardWidgetPayload | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !widget || !widgetTypeDef) {
            return;
        }

        const { inheritFilters, filtersOverride } = initialFilterState(globalFilters, widget.filters_json);
        const mergedConfig = { ...widgetTypeDef.default_config, ...widget.config_json };

        form.reset({
            metric_key: widget.metric_key,
            title: widget.title ?? '',
            inheritFilters,
            filtersOverride,
            config_json: mergedConfig,
        });
        setPreviewPayload(null);
        setPreviewError(null);
    }, [open, widget, widgetTypeDef, globalFilters, form]);

    const watched = useWatch({ control: form.control }) as WidgetConfigFormValues | undefined;

    const watchedCfg = watched?.config_json as Record<string, unknown> | undefined;
    const integrationSourceIdFromCfg = useMemo(() => {
        const raw = watchedCfg?.integration_source_id;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            return raw;
        }
        if (typeof raw === 'string' && raw !== '') {
            const n = Number(raw);
            return Number.isFinite(n) ? n : 0;
        }
        return 0;
    }, [watchedCfg]);

    const dataSourceSelectValue = useMemo(() => {
        const mk = watched?.metric_key ?? '';
        if (mk === 'integration_source_count' || mk === 'integration_source_table') {
            return integrationSourceIdFromCfg > 0 ? `integration:${integrationSourceIdFromCfg}` : 'standard';
        }
        return 'standard';
    }, [watched?.metric_key, integrationSourceIdFromCfg]);

    const showDataSourceDropdown =
        !!widget &&
        integrationSourcesForWidgets.length > 0 &&
        (widget.widget_type === 'kpi_card' || widget.widget_type === 'data_table');

    const showMetricCombobox =
        !watched?.metric_key ||
        (watched.metric_key !== 'integration_source_count' &&
            watched.metric_key !== 'integration_source_table');

    /** Legacy or inconsistent drafts: integration metric without a source id — attach the first available source. */
    useEffect(() => {
        if (!open || integrationSourcesForWidgets.length === 0) {
            return;
        }
        const mk = form.getValues('metric_key');
        const cfg = form.getValues('config_json') as Record<string, unknown>;
        const sid = Number(cfg.integration_source_id ?? 0);
        if ((mk === 'integration_source_count' || mk === 'integration_source_table') && sid <= 0) {
            const id = integrationSourcesForWidgets[0]?.id;
            if (id !== undefined && id > 0) {
                handleDataSourceChange(`integration:${id}`);
            }
        }
    }, [open, integrationSourcesForWidgets, form, handleDataSourceChange]);

    const runPreview = useCallback(async () => {
        if (!open || !widget || !widgetTypeDef) {
            return;
        }

        const values = form.getValues();
        const body = buildPreviewRequestWidget(widget, values, globalFilters);

        if (!values.metric_key?.trim()) {
            setPreviewPayload(null);
            setPreviewLoading(false);
            setPreviewError(null);
            return;
        }

        previewAbortRef.current?.abort();
        const ac = new AbortController();
        previewAbortRef.current = ac;

        setPreviewLoading(true);
        setPreviewError(null);

        try {
            const preview = await postWidgetPreview({ widget: body }, { signal: ac.signal });
            if (!ac.signal.aborted) {
                setPreviewPayload(preview);
            }
        } catch (e: unknown) {
            if (ac.signal.aborted) {
                return;
            }
            const msg =
                typeof e === 'object' && e !== null && 'message' in e
                    ? String((e as { message?: unknown }).message)
                    : 'Preview failed.';
            setPreviewError(msg);
            setPreviewPayload(null);
        } finally {
            if (!ac.signal.aborted) {
                setPreviewLoading(false);
            }
        }
    }, [open, widget, widgetTypeDef, globalFilters, form]);

    useEffect(() => {
        if (!open || !widget) {
            return;
        }

        const t = window.setTimeout(() => {
            void runPreview();
        }, 350);

        return () => window.clearTimeout(t);
    }, [open, widget, watched, globalFilters, runPreview]);

    const displayWidget: DashboardWidgetPayload | null = useMemo(() => {
        if (!widget || !widgetTypeDef || !watched) {
            return null;
        }

        const metricMeta = availableMetrics.find((m) => m.key === watched.metric_key);
        const filters_json = buildFiltersJsonForSave(
            watched.inheritFilters,
            globalFilters,
            watched.filtersOverride,
        );

        return {
            ...widget,
            metric_key: watched.metric_key,
            title: watched.title.trim() === '' ? null : watched.title.trim(),
            config_json: watched.config_json,
            filters_json,
            metric_label: previewPayload?.metric_label ?? metricMeta?.label ?? widget.metric_label,
            data: previewPayload?.data ?? widget.data,
            export_table: previewPayload?.export_table ?? widget.export_table,
        };
    }, [widget, widgetTypeDef, watched, previewPayload, availableMetrics, globalFilters]);

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            onCancel();
        }
    };

    const handleSubmit = form.handleSubmit(async (values) => {
        if (!widget) {
            return;
        }

        const body = buildPreviewRequestWidget(widget, values, globalFilters);

        try {
            const preview = await postWidgetPreview({ widget: body });
            const merged: DashboardWidgetPayload = {
                ...widget,
                ...preview,
                layout_x: widget.layout_x,
                layout_y: widget.layout_y,
                layout_w: widget.layout_w,
                layout_h: widget.layout_h,
                sort_order: widget.sort_order,
                id: widget.id,
                filters_json: (body.filters_json ?? {}) as Record<string, unknown>,
                config_json: values.config_json,
                title: values.title.trim() === '' ? null : values.title.trim(),
                metric_key: values.metric_key,
            };
            onSave(merged);
        } catch {
            form.setError('root', { message: 'Could not save the widget. Check your connection and try again.' });
        }
    });

    if (!widget) {
        return null;
    }

    const heading = mode === 'create' ? 'Configure new widget' : 'Configure widget';

    return (
        <Dialog open={open && !!widget} onOpenChange={handleOpenChange}>
            <DialogContent className="flex max-h-[min(92vh,880px)] w-[min(96vw,1100px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
                <DialogHeader className="border-b border-border px-6 py-4 text-left">
                    <DialogTitle>{heading}</DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">{widgetTypeDef?.label ?? widget.widget_type}</span>
                        <span className="mx-1.5 text-border">·</span>
                        Configure data, then appearance and filters. Save the dashboard from the toolbar when you are
                        done.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-5">
                            <div className="flex min-h-[280px] flex-col border-b border-border bg-muted/20 p-4 lg:col-span-2 lg:border-b-0 lg:border-r">
                                <div className="mb-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                        Live preview
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground/90">
                                        Updates as you change Data settings.
                                    </p>
                                </div>
                                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/90 bg-card p-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
                                    {previewLoading ? (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70 backdrop-blur-[1px]">
                                            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                                            <span className="sr-only">Loading preview</span>
                                        </div>
                                    ) : null}
                                    {previewError ? (
                                        <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                                            {previewError}
                                        </div>
                                    ) : null}
                                    {displayWidget ? (
                                        <div className="min-h-0 flex-1 overflow-auto">
                                            <WidgetRenderer
                                                widget={displayWidget}
                                                data={displayWidget.data}
                                                isEditMode
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <ScrollArea className="min-h-[320px] lg:col-span-3 lg:h-[min(70vh,560px)]">
                                <div className="p-4 pr-5">
                                    <Tabs defaultValue="data" className="w-full">
                                        <TabsList className="mb-5 grid h-11 w-full grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1">
                                            <TabsTrigger
                                                value="data"
                                                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                            >
                                                Data
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="appearance"
                                                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                            >
                                                Appearance
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="filters"
                                                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                            >
                                                Filters
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="data" className="space-y-5">
                                            {showDataSourceDropdown ? (
                                                <section className={dataSectionClass} aria-labelledby="dashflo-data-source-heading">
                                                    <p id="dashflo-data-source-heading" className={sectionEyebrowClass}>
                                                        Step 1 · Data source
                                                    </p>
                                                    <p className={sectionTitleClass}>Where does this widget get its numbers?</p>
                                                    <p className={sectionHintClass}>
                                                        Lead pipeline uses your existing dashboard metrics. Integrations
                                                        are listed separately so you do not hunt for them inside the
                                                        metric picker.
                                                    </p>
                                                    <div className="mt-4 space-y-2">
                                                        <Label
                                                            htmlFor="dashflo-data-source"
                                                            className="text-sm font-medium text-foreground"
                                                        >
                                                            Source
                                                        </Label>
                                                        <Select
                                                            value={dataSourceSelectValue}
                                                            onValueChange={handleDataSourceChange}
                                                        >
                                                            <SelectTrigger
                                                                id="dashflo-data-source"
                                                                className="h-11 border-input bg-background text-base font-medium"
                                                            >
                                                                <SelectValue placeholder="Choose a data source" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="standard">
                                                                Lead pipeline · standard KPI metrics
                                                            </SelectItem>
                                                            {integrationSourcesForWidgets.map((s) => (
                                                                <SelectItem
                                                                    key={s.id}
                                                                    value={`integration:${s.id}`}
                                                                >
                                                                    {`${s.name} · ${s.kind === 'webhook' ? 'Webhook' : 'API'}`}
                                                                </SelectItem>
                                                            ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </section>
                                            ) : null}

                                            {showMetricCombobox ? (
                                                <section className={dataSectionClass} aria-labelledby="dashflo-metric-heading">
                                                    <p id="dashflo-metric-heading" className={sectionEyebrowClass}>
                                                        {showDataSourceDropdown ? 'Step 2 · Metric' : 'Metric'}
                                                    </p>
                                                    <p className={sectionTitleClass}>Which number should we show?</p>
                                                    <p className={sectionHintClass}>
                                                        Search by name or browse by category. The preview updates as you
                                                        change this.
                                                    </p>
                                                    <div className="mt-4">
                                                        <MetricCombobox
                                                            control={form.control}
                                                            name="metric_key"
                                                            metrics={standardMetricsOnly}
                                                            showLabel={false}
                                                        />
                                                    </div>
                                                </section>
                                            ) : (
                                                <section className={dataSectionClass} aria-labelledby="dashflo-int-metric-heading">
                                                    <p id="dashflo-int-metric-heading" className={sectionEyebrowClass}>
                                                        Step 2 · Integration
                                                    </p>
                                                    <p className={sectionTitleClass}>Using your integration source</p>
                                                    <p className="mt-2 rounded-md border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-sm leading-snug text-foreground">
                                                        {widget.widget_type === 'kpi_card'
                                                            ? 'This card shows one total from the source you picked above. Choose row count or a measure sum in the next section.'
                                                            : 'This table lists rows from the source you picked above. Choose columns in the next section.'}
                                                    </p>
                                                </section>
                                            )}

                                            <IntegrationSourceWidgetFields
                                                control={form.control}
                                                integrationSources={integrationSourcesForWidgets}
                                            />
                                            {metricsForPicker.length === 0 ? (
                                                <p className="rounded-md border border-dashed border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
                                                    No metrics are available for this widget type.
                                                </p>
                                            ) : null}

                                            <section className={dataSectionClass}>
                                                <p className={sectionEyebrowClass}>Display</p>
                                                <p className={sectionTitleClass}>Title on the widget</p>
                                                <p className={sectionHintClass}>
                                                    Leave blank to use the metric name as the visible title.
                                                </p>
                                                <FormField
                                                    control={form.control}
                                                    name="title"
                                                    render={({ field }) => (
                                                        <FormItem className="mt-4">
                                                            <FormLabel className="text-sm font-medium text-foreground">
                                                                Title override
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    className="h-11"
                                                                    placeholder="Leave blank to use the metric name"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </section>
                                        </TabsContent>

                                        <TabsContent value="appearance">
                                            {widgetTypeDef?.config_schema?.length ? (
                                                <AppearanceConfigFields
                                                    control={form.control}
                                                    schema={widgetTypeDef.config_schema}
                                                />
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    This widget has no appearance options.
                                                </p>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="filters">
                                            <WidgetScopedFiltersForm
                                                control={form.control}
                                                globalFilters={globalFilters}
                                                filterOptions={filterOptions}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </ScrollArea>
                        </div>

                        {form.formState.errors.root ? (
                            <p className="px-6 text-xs text-destructive">{form.formState.errors.root.message}</p>
                        ) : null}

                        <DialogFooter className="border-t border-border px-6 py-4">
                            <Button type="button" variant="ghost" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                                        Saving…
                                    </>
                                ) : (
                                    'Save widget'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
