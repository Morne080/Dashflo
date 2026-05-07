import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    optionsFromFilterMap,
    picklistIncludes,
    shouldFetchRemoteFilterValues,
    showTrafficSourceScope,
    stringifyPicklistOptions,
} from '@/lib/dashboardFilterFieldValues';
import {
    STANDARD_DIMENSIONS,
    isStandardFilterKey,
    labelForStandardKey,
    standardOptions,
    type StandardFilterKey,
} from '@/lib/dashboardFilterStandardDimensions';
import type { CustomFilterRow, DashboardFilterOptions, DashboardFilters } from '@/types/dashboard';
import axios, { isCancel } from 'axios';
import { X } from 'lucide-react';
import * as React from 'react';

/** Matches widget library / config selects — full-width, readable on dark UI. */
const FILTER_SELECT_TRIGGER =
    'h-10 w-full justify-between bg-card text-left text-sm font-normal shadow-sm hover:bg-accent/50';

type DashboardFiltersSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters: DashboardFilters;
    filterOptions: DashboardFilterOptions;
    /** Applies merged patches (same URL/query semantics as the rest of the dashboard). */
    onApplyPatch: (patch: Partial<DashboardFilters>) => void;
    /** Edit-dashboard mode: only lead/integration fields (no Source/Status/SOL toolbar dimensions). */
    customColumnPickerOnly?: boolean;
};

/** Radix Select + strict `includes` need the controlled value to match option strings (DB may return numbers). */
function coercePicklistValue(current: string, options: readonly string[]): string {
    if (options.length === 0) {
        return current;
    }
    const cur = String(current);
    return options.some((o) => String(o) === cur) ? cur : options[0]!;
}

export function DashboardFiltersSheet({
    open,
    onOpenChange,
    filters,
    filterOptions,
    onApplyPatch,
    customColumnPickerOnly = false,
}: DashboardFiltersSheetProps) {
    const catalog = filterOptions.custom_filter_fields ?? [];

    const fieldKeys =
        catalog.length > 0
            ? catalog.map((r) => r.key)
            : Object.keys(filterOptions.custom_filter_field_labels ?? {});

    const catalogRowsOther = React.useMemo(
        () =>
            (catalog.length > 0
                ? catalog
                : fieldKeys.map((k) => ({
                      key: k,
                      label: filterOptions.custom_filter_field_labels[k] ?? k,
                      scope: 'lead' as const,
                  }))
            ).filter((row) => !STANDARD_DIMENSIONS.some((d) => d.key === row.key)),
        [catalog, fieldKeys, filterOptions.custom_filter_field_labels],
    );

    const scopeForFieldKey = React.useCallback(
        (field: string): 'lead' | 'fact' => {
            const fromCatalog = catalog.find((r) => r.key === field);
            return fromCatalog?.scope ?? 'lead';
        },
        [catalog],
    );

    const labelForField = React.useCallback(
        (field: string) => {
            if (isStandardFilterKey(field)) {
                return labelForStandardKey(field);
            }
            return filterOptions.custom_filter_field_labels[field] ?? field;
        },
        [filterOptions.custom_filter_field_labels],
    );

    const customRows = filters.custom_filters ?? [];

    const clearStandardFilter = (key: StandardFilterKey) => {
        onApplyPatch({ [key]: null });
    };

    const removeCustomAt = (index: number) => {
        const nextRows = customRows.filter((_, i) => i !== index);
        onApplyPatch({ custom_filters: nextRows });
    };

    const [trafficScope, setTrafficScope] = React.useState('');
    const [draftColumn, setDraftColumn] = React.useState<string>('');
    const [draftValue, setDraftValue] = React.useState('');
    const [remoteValues, setRemoteValues] = React.useState<string[]>([]);
    const [remoteLoading, setRemoteLoading] = React.useState(false);
    const [remoteError, setRemoteError] = React.useState<string | null>(null);

    const firstColumnKey = customColumnPickerOnly
        ? (catalogRowsOther[0]?.key ?? '')
        : (STANDARD_DIMENSIONS[0]?.key ?? catalogRowsOther[0]?.key ?? '');

    const resetBuilderDraft = React.useCallback(() => {
        setTrafficScope(filters.source ?? '');
        setDraftColumn(firstColumnKey);
        setDraftValue('');
        setRemoteValues([]);
        setRemoteError(null);
        setRemoteLoading(false);
    }, [firstColumnKey, filters.source]);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const valid = new Set<string>(
            customColumnPickerOnly
                ? catalogRowsOther.map((r) => r.key)
                : [...STANDARD_DIMENSIONS.map((d) => d.key), ...catalogRowsOther.map((r) => r.key)],
        );
        setDraftColumn((prev) => (prev && valid.has(prev) ? prev : firstColumnKey));
        setTrafficScope(filters.source ?? '');
        setDraftValue('');
        setRemoteValues([]);
        setRemoteError(null);
        setRemoteLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: read latest Source only when panel opens/catalog changes; toolbar-only Source updates use the effect below.
    }, [open, catalogRowsOther, firstColumnKey, customColumnPickerOnly]);

    /** Toolbar Source changed while sheet open — update traffic scope only (picker reloads via fetch effect). */
    React.useEffect(() => {
        if (!open) {
            return;
        }
        setTrafficScope(filters.source ?? '');
    }, [filters.source, open]);

    const staticOptionsFromMap = React.useMemo(
        () => optionsFromFilterMap(draftColumn, filterOptions),
        [draftColumn, filterOptions],
    );

    const fetchRemoteValues = React.useMemo(
        () => shouldFetchRemoteFilterValues(draftColumn, trafficScope, filterOptions),
        [draftColumn, trafficScope, filterOptions],
    );

    React.useEffect(() => {
        if (!open || !draftColumn || fetchRemoteValues) {
            return;
        }
        if (!isStandardFilterKey(draftColumn)) {
            return;
        }
        const opts = stringifyPicklistOptions(standardOptions(draftColumn, filterOptions));
        const cur = filters[draftColumn];
        if (cur != null && cur !== '' && picklistIncludes(opts, String(cur))) {
            setDraftValue(String(cur));
        } else if (opts.length) {
            setDraftValue(opts[0]!);
        } else {
            setDraftValue('');
        }
        setRemoteValues([]);
        setRemoteLoading(false);
        setRemoteError(null);
    }, [open, draftColumn, filterOptions, filters, fetchRemoteValues]);

    /** Preloaded picklist from the dashboard (no extra request unless traffic scope narrows values). */
    React.useEffect(() => {
        if (!open || !draftColumn || fetchRemoteValues) {
            return;
        }
        if (isStandardFilterKey(draftColumn)) {
            return;
        }
        const opts = staticOptionsFromMap;
        if (!opts || opts.length === 0) {
            return;
        }
        setDraftValue((prev) => coercePicklistValue(prev, opts));
        setRemoteValues([]);
        setRemoteLoading(false);
        setRemoteError(null);
    }, [open, draftColumn, fetchRemoteValues, staticOptionsFromMap]);

    React.useEffect(() => {
        if (!open || !draftColumn || !fetchRemoteValues) {
            return;
        }

        const ac = new AbortController();
        setRemoteLoading(true);
        setRemoteError(null);
        setDraftValue('');

        const params: Record<string, string> = { column: draftColumn };
        if (trafficScope && showTrafficSourceScope(draftColumn)) {
            params.traffic_source = trafficScope;
        }

        axios
            .get<{ values: string[] }>(route('dashboard.filter-column-values'), {
                params,
                signal: ac.signal,
            })
            .then((res) => {
                const list = stringifyPicklistOptions(res.data.values ?? []);
                setRemoteValues(list);
                if (list.length) {
                    setDraftValue(list[0]!);
                }
            })
            .catch((err: unknown) => {
                if (isCancel(err)) {
                    return;
                }
                setRemoteValues([]);
                setRemoteError('Could not load values. Try again.');
            })
            .finally(() => {
                setRemoteLoading(false);
            });

        return () => ac.abort();
    }, [open, draftColumn, trafficScope, fetchRemoteValues]);

    const staticPicklist = React.useMemo(() => {
        if (!draftColumn || !isStandardFilterKey(draftColumn)) {
            return null;
        }
        const opts = stringifyPicklistOptions(standardOptions(draftColumn, filterOptions));

        return opts.length ? opts : null;
    }, [draftColumn, filterOptions]);

    /** Keep `draftValue` aligned with picklist options (Radix Select + number/string mismatches). */
    React.useLayoutEffect(() => {
        if (!open || !draftColumn) {
            return;
        }
        if (fetchRemoteValues) {
            if (remoteLoading || remoteError || remoteValues.length === 0) {
                return;
            }
            const next = coercePicklistValue(draftValue, remoteValues);
            if (next !== draftValue) {
                setDraftValue(next);
            }
            return;
        }
        if (isStandardFilterKey(draftColumn) && staticPicklist && staticPicklist.length > 0) {
            const next = coercePicklistValue(draftValue, staticPicklist);
            if (next !== draftValue) {
                setDraftValue(next);
            }
            return;
        }
        if (!isStandardFilterKey(draftColumn) && staticOptionsFromMap && staticOptionsFromMap.length > 0) {
            const next = coercePicklistValue(draftValue, staticOptionsFromMap);
            if (next !== draftValue) {
                setDraftValue(next);
            }
        }
    }, [
        open,
        draftColumn,
        draftValue,
        fetchRemoteValues,
        remoteLoading,
        remoteError,
        remoteValues,
        staticPicklist,
        staticOptionsFromMap,
    ]);

    const applyDisabled =
        !draftColumn ||
        !draftValue.trim() ||
        remoteLoading ||
        (isStandardFilterKey(draftColumn) &&
            staticPicklist != null &&
            staticPicklist.length > 0 &&
            !picklistIncludes(staticPicklist, draftValue)) ||
        (!fetchRemoteValues &&
            staticOptionsFromMap != null &&
            staticOptionsFromMap.length > 0 &&
            !picklistIncludes(staticOptionsFromMap, draftValue)) ||
        (fetchRemoteValues && remoteValues.length > 0 && !picklistIncludes(remoteValues, draftValue)) ||
        (fetchRemoteValues && !remoteError && remoteValues.length === 0);

    const submitAddFilter = () => {
        const col = draftColumn.trim();
        const val = draftValue.trim();
        if (!col || !val) {
            return;
        }

        if (!customColumnPickerOnly && isStandardFilterKey(col)) {
            const opts = stringifyPicklistOptions(standardOptions(col, filterOptions));
            if (opts.length > 0 && !picklistIncludes(opts, val)) {
                return;
            }
            onApplyPatch({ [col]: val } as Partial<DashboardFilters>);
            resetBuilderDraft();
            return;
        }

        const inCustomCatalog =
            (filterOptions.custom_filter_fields ?? []).some((r) => r.key === col) ||
            Object.prototype.hasOwnProperty.call(filterOptions.custom_filter_field_labels, col);
        if (!inCustomCatalog) {
            return;
        }

        if (
            shouldFetchRemoteFilterValues(col, trafficScope, filterOptions) &&
            remoteValues.length > 0 &&
            !picklistIncludes(remoteValues, val)
        ) {
            return;
        }

        const mapOpts = optionsFromFilterMap(col, filterOptions);
        if (
            !shouldFetchRemoteFilterValues(col, trafficScope, filterOptions) &&
            mapOpts &&
            mapOpts.length > 0 &&
            !picklistIncludes(mapOpts, val)
        ) {
            return;
        }

        const scope = scopeForFieldKey(col);
        const nextRows = customRows.filter(
            (r) => !(r.field === col && (r.scope ?? 'lead') === scope),
        );
        const normalized: CustomFilterRow =
            scope === 'fact' ? { field: col, value: val, scope: 'fact' } : { field: col, value: val };
        nextRows.push(normalized);

        const patch: Partial<DashboardFilters> = {
            custom_filters: nextRows.slice(-10),
        };

        const trafficForPatch = trafficScope.trim();
        if (trafficForPatch !== '' && showTrafficSourceScope(col)) {
            patch.source = trafficForPatch;
        }

        onApplyPatch(patch);
        resetBuilderDraft();
    };

    const hasActiveStandard = STANDARD_DIMENSIONS.some(({ key }) => {
        const v = filters[key];
        return v != null && v !== '';
    });
    const hasAnyFilters = hasActiveStandard || customRows.length > 0;

    const clearAllSheetFilters = () => {
        onApplyPatch({
            source: null,
            status: null,
            vertical: null,
            sol: null,
            state: null,
            supplier_code: null,
            buyer_code: null,
            custom_filters: [],
        });
    };

    // Radix Select portals to `body`; default modal sheets trap pointers and block dropdown clicks.
    return (
        <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
            >
                <div className="border-b border-border px-6 pb-4 pt-2">
                    <SheetHeader className="space-y-1 pr-8 text-left">
                        <SheetTitle>{customColumnPickerOnly ? 'Custom dashboard filters' : 'Dashboard filters'}</SheetTitle>
                        <SheetDescription>
                            {customColumnPickerOnly ? (
                                <>
                                    Add lead columns or integration dimensions as dropdown filters. They apply to the{' '}
                                    <span className="font-medium text-foreground">entire dashboard</span> unless a widget
                                    overrides filters. Save the dashboard layout to keep changes.
                                </>
                            ) : (
                                <>
                                    Same idea as adding metrics: pick fields from the lists below. These filters apply to the{' '}
                                    <span className="font-medium text-foreground">entire dashboard</span> — every widget uses them
                                    unless you override filters on a specific widget in edit mode.
                                </>
                            )}
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">
                    <section className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Active filters</h3>
                            {hasAnyFilters ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={clearAllSheetFilters}
                                >
                                    Clear all
                                </Button>
                            ) : null}
                        </div>
                        {!hasAnyFilters ? (
                            <p className="text-sm text-muted-foreground">None yet. Add a filter in the section below.</p>
                        ) : (
                            <ul className="flex flex-wrap gap-2">
                                {STANDARD_DIMENSIONS.map(({ key }) => {
                                    const v = filters[key];
                                    if (v == null || v === '') {
                                        return null;
                                    }
                                    return (
                                        <li key={key}>
                                            <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs text-foreground">
                                                <span className="truncate font-medium">{labelForStandardKey(key)}</span>
                                                <span className="text-muted-foreground">=</span>
                                                <span className="truncate">{v}</span>
                                                <button
                                                    type="button"
                                                    className="ml-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
                                                    aria-label={`Remove ${labelForStandardKey(key)} filter`}
                                                    onClick={() => clearStandardFilter(key)}
                                                >
                                                    <X className="size-3.5" />
                                                </button>
                                            </span>
                                        </li>
                                    );
                                })}
                                {customRows.map((row, idx) => (
                                    <li key={`${row.field}-${row.scope ?? 'lead'}-${idx}-${row.value}`}>
                                        <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs text-foreground">
                                            <span className="truncate font-medium">{labelForField(row.field)}</span>
                                            <span className="text-muted-foreground">=</span>
                                            <span className="truncate">{row.value}</span>
                                            <button
                                                type="button"
                                                className="ml-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
                                                aria-label={`Remove ${labelForField(row.field)} filter`}
                                                onClick={() => removeCustomAt(idx)}
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="space-y-4 border-t border-border pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Add a filter</h3>
                        {customColumnPickerOnly && catalogRowsOther.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No lead or integration fields are available yet (import leads or connect an integration).
                            </p>
                        ) : null}
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">1. Traffic source</span>
                                <Select
                                    value={trafficScope || '__any__'}
                                    onValueChange={(v) => setTrafficScope(v === '__any__' ? '' : v)}
                                >
                                    <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                                        <SelectValue placeholder="Any traffic source" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[min(60vh,20rem)]">
                                        <SelectItem value="__any__">Any traffic source</SelectItem>
                                        {filterOptions.sources.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] leading-snug text-muted-foreground">
                                    Starts from your dashboard <span className="font-medium text-foreground">Source</span>{' '}
                                    filter when set. Narrows value lists for lead and integration fields (dropdown loads
                                    distinct values for that traffic source). Choosing &quot;Any&quot; loads values across
                                    all sources where applicable.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">2. Column</span>
                                <Select
                                    value={draftColumn || firstColumnKey}
                                    onValueChange={setDraftColumn}
                                    disabled={customColumnPickerOnly && catalogRowsOther.length === 0}
                                >
                                    <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                                        <SelectValue placeholder="Choose column" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[min(60vh,22rem)]">
                                        {!customColumnPickerOnly ? (
                                            <SelectGroup>
                                                <SelectLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    Dimensions
                                                </SelectLabel>
                                                {STANDARD_DIMENSIONS.map((row) => (
                                                    <SelectItem key={row.key} value={row.key}>
                                                        {row.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ) : null}
                                        {catalogRowsOther.length > 0 ? (
                                            <>
                                                {!customColumnPickerOnly ? <SelectSeparator /> : null}
                                                <SelectGroup>
                                                    <SelectLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                        {customColumnPickerOnly ? 'Fields' : 'Lead and integration fields'}
                                                    </SelectLabel>
                                                    {catalogRowsOther.map((row) => (
                                                        <SelectItem key={row.key} value={row.key}>
                                                            {row.label}
                                                            {row.scope === 'fact' ? ' (integration)' : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </>
                                        ) : null}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">3. Value</span>
                                {fetchRemoteValues ? (
                                    remoteLoading ? (
                                        <p className="py-2 text-sm text-muted-foreground">Loading values…</p>
                                    ) : remoteError ? (
                                        <p className="py-2 text-sm text-destructive">{remoteError}</p>
                                    ) : remoteValues.length === 0 ? (
                                        <p className="py-2 text-sm text-muted-foreground">
                                            No values for this column
                                            {trafficScope.trim() !== '' && showTrafficSourceScope(draftColumn)
                                                ? ` with traffic source “${trafficScope.trim()}”.`
                                                : '.'}{' '}
                                            Try another traffic source or column.
                                        </p>
                                    ) : (
                                        <Select value={draftValue} onValueChange={setDraftValue}>
                                            <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                                                <SelectValue placeholder="Choose value" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[min(60vh,20rem)]">
                                                {remoteValues.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )
                                ) : draftColumn && isStandardFilterKey(draftColumn) && staticPicklist ? (
                                    <Select value={draftValue} onValueChange={setDraftValue}>
                                        <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                                            <SelectValue placeholder="Choose value" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[min(60vh,20rem)]">
                                            {staticPicklist.map((opt) => (
                                                <SelectItem key={opt} value={opt}>
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : draftColumn && staticOptionsFromMap && staticOptionsFromMap.length > 0 ? (
                                    <Select value={draftValue} onValueChange={setDraftValue}>
                                        <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                                            <SelectValue placeholder="Choose value" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[min(60vh,20rem)]">
                                            {staticOptionsFromMap.map((opt) => (
                                                <SelectItem key={opt} value={opt}>
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="py-2 text-sm text-muted-foreground">Choose a column first.</p>
                                )}
                            </div>

                            <Button
                                type="button"
                                className="w-full sm:w-auto"
                                onClick={submitAddFilter}
                                disabled={
                                    applyDisabled || (customColumnPickerOnly && catalogRowsOther.length === 0)
                                }
                            >
                                Add filter
                            </Button>
                        </div>
                    </section>
                </div>

                <SheetFooter className="border-t border-border px-6 py-4">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
