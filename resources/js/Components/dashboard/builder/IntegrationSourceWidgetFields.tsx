import type { WidgetConfigFormValues } from '@/Components/dashboard/builder/WidgetScopedFiltersForm';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { fetchIntegrationWidgetFields, type IntegrationWidgetFieldsResponse } from '@/lib/fetchIntegrationWidgetFields';
import { integrationPathToAccessor } from '@/lib/integrationWidgetPaths';
import { ChevronDown, ChevronUp, Loader2, Table2, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Control, useController, useWatch } from 'react-hook-form';

export type IntegrationSourceOption = {
    id: number;
    name: string;
    kind: string;
};

type ColumnRow = { path: string; header: string };

function readColumns(raw: unknown): ColumnRow[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    const out: ColumnRow[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const path = String((item as { path?: unknown }).path ?? '').trim();
        if (!path) {
            continue;
        }
        const header = String((item as { header?: unknown }).header ?? '').trim();
        out.push({ path, header: header || path });
    }

    return out;
}

function buildColumnHeaders(columns: ColumnRow[]): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const c of columns) {
        headers[integrationPathToAccessor(c.path)] = c.header;
    }

    return headers;
}

export type IntegrationSourceWidgetFieldsProps = {
    control: Control<WidgetConfigFormValues>;
    integrationSources: IntegrationSourceOption[];
};

export function IntegrationSourceWidgetFields({
    control,
    integrationSources,
}: IntegrationSourceWidgetFieldsProps): JSX.Element | null {
    const metricKey = useWatch({ control, name: 'metric_key' });

    const { field: configField } = useController({
        control,
        name: 'config_json',
        defaultValue: {},
    });

    const cfg = useMemo(() => (configField.value as Record<string, unknown>) ?? {}, [configField.value]);

    const sourceId =
        typeof cfg.integration_source_id === 'number'
            ? cfg.integration_source_id
            : typeof cfg.integration_source_id === 'string' && cfg.integration_source_id !== ''
              ? Number(cfg.integration_source_id)
              : 0;

    const columns = useMemo(() => readColumns(cfg.columns), [cfg.columns]);

    const patchConfig = useCallback(
        (patch: Record<string, unknown>) => {
            const next = { ...cfg, ...patch };
            if (Array.isArray(next.columns)) {
                next.column_headers = buildColumnHeaders(readColumns(next.columns));
            }
            configField.onChange(next);
        },
        [cfg, configField],
    );

    const togglePath = useCallback(
        (path: string, defaultHeader: string) => {
            const current = readColumns(cfg.columns);
            const exists = current.find((c) => c.path === path);
            const nextCols = exists ? current.filter((c) => c.path !== path) : [...current, { path, header: defaultHeader }];
            patchConfig({ columns: nextCols });
        },
        [cfg.columns, patchConfig],
    );

    const isChecked = useCallback(
        (path: string) => readColumns(cfg.columns).some((c) => c.path === path),
        [cfg.columns],
    );

    const moveColumn = useCallback(
        (index: number, delta: number) => {
            const next = [...columns];
            const j = index + delta;
            if (j < 0 || j >= next.length) {
                return;
            }
            const a = next[index];
            const b = next[j];
            if (!a || !b) {
                return;
            }
            next[index] = b;
            next[j] = a;
            patchConfig({ columns: next });
        },
        [columns, patchConfig],
    );

    const [fields, setFields] = useState<IntegrationWidgetFieldsResponse | null>(null);
    const [fieldsLoading, setFieldsLoading] = useState(false);
    const [fieldsError, setFieldsError] = useState<string | null>(null);

    useEffect(() => {
        const needsFields =
            (metricKey === 'integration_source_table' || metricKey === 'integration_source_count') && sourceId > 0;
        if (!needsFields) {
            setFields(null);
            setFieldsError(null);

            return;
        }

        const ac = new AbortController();
        setFieldsLoading(true);
        setFieldsError(null);

        void fetchIntegrationWidgetFields(sourceId, { signal: ac.signal })
            .then((data) => {
                if (!ac.signal.aborted) {
                    setFields(data);
                }
            })
            .catch(() => {
                if (!ac.signal.aborted) {
                    setFieldsError('Could not load field suggestions.');
                    setFields(null);
                }
            })
            .finally(() => {
                if (!ac.signal.aborted) {
                    setFieldsLoading(false);
                }
            });

        return () => ac.abort();
    }, [metricKey, sourceId]);

    if (metricKey !== 'integration_source_table' && metricKey !== 'integration_source_count') {
        return null;
    }

    if (integrationSources.length === 0) {
        return (
            <div className="flex gap-3 rounded-lg border border-dashed border-muted-foreground/35 bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-muted-foreground/90" aria-hidden>
                    <Table2 className="size-5" />
                </span>
                <div>
                    <p className="font-medium text-foreground">No integration sources yet</p>
                    <p className="mt-1 text-xs leading-relaxed">
                        Add a source under Integrations to connect webhook or API data to this widget.
                    </p>
                </div>
            </div>
        );
    }

    const kpiModeRaw = typeof cfg.integration_kpi_mode === 'string' ? cfg.integration_kpi_mode : 'rows';
    const kpiMode = kpiModeRaw === 'sum' ? 'sum' : 'rows';
    const kpiMeasure =
        typeof cfg.integration_kpi_measure === 'string' && cfg.integration_kpi_measure.trim() !== ''
            ? cfg.integration_kpi_measure.trim()
            : '';

    return (
        <section className="space-y-4 rounded-lg border border-primary/25 bg-primary/[0.04] p-4 shadow-sm ring-1 ring-primary/10 dark:bg-primary/[0.06] dark:ring-primary/15">
            <header className="border-b border-primary/15 pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary/90">
                    Integration fields
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                    {metricKey === 'integration_source_count'
                        ? 'What should this KPI display?'
                        : 'Which columns appear in the table?'}
                </p>
            </header>

            {metricKey === 'integration_source_count' && sourceId > 0 ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="size-4 shrink-0 text-primary" aria-hidden />
                            <Label htmlFor="dashflo-kpi-value-mode" className="text-sm font-medium text-foreground">
                                Value to show
                            </Label>
                        </div>
                        {fieldsLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                    </div>
                    {fieldsError ? <p className="text-xs text-destructive">{fieldsError}</p> : null}
                    <Select
                        value={kpiMode}
                        onValueChange={(v) => {
                            if (v === 'sum') {
                                patchConfig({
                                    integration_kpi_mode: 'sum',
                                    integration_kpi_measure: kpiMeasure || (fields?.measure_keys[0] ?? ''),
                                });
                            } else {
                                patchConfig({
                                    integration_kpi_mode: 'rows',
                                    integration_kpi_measure: '',
                                });
                            }
                        }}
                    >
                        <SelectTrigger id="dashflo-kpi-value-mode" className="h-11 border-input bg-background">
                            <SelectValue placeholder="Choose what to display" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="rows">Row count</SelectItem>
                            <SelectItem value="sum">Sum of measure</SelectItem>
                        </SelectContent>
                    </Select>
                    {kpiMode === 'sum' ? (
                        <div className="space-y-2 rounded-md border border-border/80 bg-background/80 p-3">
                            <Label htmlFor="dashflo-kpi-measure" className="text-xs font-medium text-muted-foreground">
                                Measure field
                            </Label>
                            <Select
                                value={kpiMeasure || undefined}
                                onValueChange={(measure) => {
                                    patchConfig({
                                        integration_kpi_mode: 'sum',
                                        integration_kpi_measure: measure,
                                    });
                                }}
                            >
                                <SelectTrigger id="dashflo-kpi-measure" className="h-11 border-input bg-background">
                                    <SelectValue placeholder="Select a numeric measure" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(fields?.measure_keys ?? []).map((k) => (
                                        <SelectItem key={k} value={k}>
                                            {k}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!fieldsLoading && fields && fields.measure_keys.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    No measure keys found yet. Ingest data for this source, then reopen this dialog.
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Counts stored rows for this source in the dashboard date range.
                        </p>
                    )}
                </div>
            ) : metricKey === 'integration_source_count' && sourceId <= 0 ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Choose an integration source under <span className="font-medium text-foreground">Data source</span>{' '}
                    above to configure this KPI.
                </p>
            ) : null}

            {metricKey === 'integration_source_table' && sourceId > 0 ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Table2 className="size-4 shrink-0 text-primary" aria-hidden />
                            <Label className="text-sm font-medium text-foreground">Columns</Label>
                        </div>
                        {fieldsLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                    </div>
                    {fieldsError ? <p className="text-xs text-destructive">{fieldsError}</p> : null}
                    {!fieldsLoading && fields && fields.dimension_keys.length === 0 && fields.measure_keys.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            No field keys discovered yet. Ingest a few payloads for this source, then reopen this
                            dialog.
                        </p>
                    ) : null}

                    {fields ? (
                        <div className="max-h-56 space-y-3 overflow-y-auto pr-1 text-sm">
                            <div className="space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Fact
                                </p>
                                {fields.fact_fields.map((f) => (
                                    <label
                                        key={f.path}
                                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
                                    >
                                        <input
                                            type="checkbox"
                                            className="rounded border-input"
                                            checked={isChecked(f.path)}
                                            onChange={() => togglePath(f.path, f.label)}
                                        />
                                        <span>{f.label}</span>
                                        <span className="font-mono text-[10px] text-muted-foreground">{f.path}</span>
                                    </label>
                                ))}
                            </div>
                            {fields.dimension_keys.length > 0 ? (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Dimensions
                                    </p>
                                    {fields.dimension_keys.map((k) => {
                                        const path = `dimensions.${k}`;
                                        return (
                                            <label
                                                key={path}
                                                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-input"
                                                    checked={isChecked(path)}
                                                    onChange={() => togglePath(path, k)}
                                                />
                                                <span>{k}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : null}
                            {fields.measure_keys.length > 0 ? (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Measures
                                    </p>
                                    {fields.measure_keys.map((k) => {
                                        const path = `measures.${k}`;
                                        return (
                                            <label
                                                key={path}
                                                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-input"
                                                    checked={isChecked(path)}
                                                    onChange={() => togglePath(path, k)}
                                                />
                                                <span>{k}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {columns.length > 0 ? (
                        <div className="space-y-2 rounded-md border border-primary/25 bg-card/80 p-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/90">
                                Column order (left → right)
                            </p>
                            <ul className="space-y-1.5">
                                {columns.map((col, idx) => (
                                    <li
                                        key={col.path}
                                        className="flex items-stretch gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm"
                                    >
                                        <div className="flex shrink-0 flex-col justify-center gap-0.5 border-r border-border pr-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 shrink-0"
                                                disabled={idx === 0}
                                                title="Earlier column (left in table)"
                                                onClick={() => moveColumn(idx, -1)}
                                            >
                                                <ChevronUp className="size-3.5" aria-hidden="true" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 shrink-0"
                                                disabled={idx === columns.length - 1}
                                                title="Later column (right in table)"
                                                onClick={() => moveColumn(idx, 1)}
                                            >
                                                <ChevronDown className="size-3.5" aria-hidden="true" />
                                            </Button>
                                        </div>
                                        <div className="min-w-0 flex-1 py-0.5">
                                            <div className="truncate font-medium text-foreground">{col.header}</div>
                                            <div className="truncate font-mono text-[10px] text-muted-foreground">
                                                {col.path}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {columns.length > 0 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => patchConfig({ columns: [], column_headers: {} })}
                        >
                            Clear columns
                        </Button>
                    ) : null}
                </div>
            ) : metricKey === 'integration_source_table' && sourceId <= 0 ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Choose an integration source under <span className="font-medium text-foreground">Data source</span>{' '}
                    above to pick columns for this table.
                </p>
            ) : null}
        </section>
    );
}
