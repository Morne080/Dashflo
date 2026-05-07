import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DashboardDateRangePicker } from '@/components/dashboard/DashboardDateRangePicker';
import { DashboardFiltersSheet } from '@/components/dashboard/DashboardFiltersSheet';
import { useDistinctDashboardFilterValues } from '@/hooks/useDistinctDashboardFilterValues';
import { persistDashboardFiltersNow } from '@/lib/persistDashboardFilters';
import {
    mergeDashboardFilters,
    visitDashboardWithFilters,
} from '@/lib/dashboardFilterNavigation';
import { cn } from '@/lib/utils';
import type { CustomFilterRow, DashboardFilterOptions, DashboardFilters } from '@/types/dashboard';
import { ListFilter, Save } from 'lucide-react';
import * as React from 'react';

type FilterBarProps = {
    dashboardId: number;
    filters: DashboardFilters;
    filterOptions: DashboardFilterOptions;
    className?: string;
};

const STANDARD_ANY = '__dashflo_any__';

/** Fixed width so flex shrink / nested scroll containers never clip the Radix chevron icon. */
const STANDARD_INLINE_TRIGGER =
    'h-8 w-[9rem] shrink-0 justify-between gap-1 border-input bg-card px-2 text-left text-xs font-normal shadow-sm sm:h-9 sm:w-[9.25rem] sm:text-sm';

function patchCustomFilterRow(
    filters: DashboardFilters,
    index: number,
    row: CustomFilterRow,
    nextRaw: string,
    anySentinel: string,
): DashboardFilters {
    const rows = [...(filters.custom_filters ?? [])];
    if (nextRaw === anySentinel) {
        rows.splice(index, 1);
    } else {
        rows[index] =
            row.scope === 'fact'
                ? { field: row.field, value: nextRaw, scope: 'fact' }
                : { field: row.field, value: nextRaw };
    }

    return mergeDashboardFilters(filters, { custom_filters: rows });
}

function CustomDimensionToolbarSelect({
    dashboardId,
    filters,
    filterOptions,
    row,
    rowIndex,
    label,
}: {
    dashboardId: number;
    filters: DashboardFilters;
    filterOptions: DashboardFilterOptions;
    row: CustomFilterRow;
    rowIndex: number;
    label: string;
}) {
    const { options: loadedOpts, loading, error, fetchRemote } = useDistinctDashboardFilterValues(
        row.field,
        filters.source,
        filterOptions,
    );

    const curStr = row.value != null && row.value !== '' ? String(row.value) : '';

    const mergedOpts = React.useMemo(() => {
        const base = loadedOpts.map(String);
        if (curStr !== '' && !base.some((o) => o === curStr)) {
            return [...base, curStr];
        }

        return base;
    }, [loadedOpts, curStr]);

    const valueOk = curStr !== '' && mergedOpts.some((o) => o === curStr);
    const selectValue = valueOk ? curStr : STANDARD_ANY;

    const disableSelect = fetchRemote && loading && mergedOpts.length === 0;

    return (
        <div className="flex shrink-0 flex-col gap-0.5">
            <span className="whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                {label}
            </span>
            <Select
                disabled={disableSelect}
                value={selectValue}
                onValueChange={(v) =>
                    visitDashboardWithFilters(
                        dashboardId,
                        patchCustomFilterRow(filters, rowIndex, row, v, STANDARD_ANY),
                    )
                }
            >
                <SelectTrigger
                    className={STANDARD_INLINE_TRIGGER}
                    aria-busy={loading}
                    title={error ?? undefined}
                >
                    <SelectValue placeholder={loading ? 'Loading…' : 'Any'} />
                </SelectTrigger>
                <SelectContent className="max-h-[min(60vh,20rem)]">
                    <SelectItem value={STANDARD_ANY}>Any</SelectItem>
                    {mergedOpts.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                            {opt}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/**
 * Edit-dashboard only: custom field filters as dropdowns + sheet to add/remove + date range + explicit save.
 * Standard dimensions (Source/Status/…) are not exposed here — use widget overrides if needed.
 */
export function FilterBar({ dashboardId, filters, filterOptions, className }: FilterBarProps) {
    const [filtersSheetOpen, setFiltersSheetOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    const customRows = filters.custom_filters ?? [];
    const activeFilterCount = customRows.length;

    const handleSaveFilters = async () => {
        setSaving(true);
        try {
            await persistDashboardFiltersNow(dashboardId, filters);
        } catch {
            window.alert('Could not save filters. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className={cn(
                'flex w-full min-w-0 flex-nowrap items-end gap-x-3 gap-y-2 overflow-x-auto pb-0.5 pt-0.5 [-ms-overflow-style:auto] [scrollbar-width:thin]',
                className,
            )}
        >
            <div className="flex shrink-0 flex-col gap-0.5">
                <span className="whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                    Custom filters
                </span>
                <Button
                    type="button"
                    variant="outline"
                    className="h-8 gap-2 border-input bg-card px-3 text-xs font-medium shadow-sm sm:h-9 sm:text-sm"
                    onClick={() => setFiltersSheetOpen(true)}
                    aria-label="Add or manage custom dashboard filters"
                >
                    <ListFilter className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="tabular-nums">
                        {activeFilterCount > 0 ? `${activeFilterCount} field${activeFilterCount === 1 ? '' : 's'}` : 'Add fields'}
                    </span>
                </Button>
            </div>

            <DashboardFiltersSheet
                open={filtersSheetOpen}
                onOpenChange={setFiltersSheetOpen}
                filters={filters}
                filterOptions={filterOptions}
                customColumnPickerOnly
                onApplyPatch={(patch) =>
                    visitDashboardWithFilters(dashboardId, mergeDashboardFilters(filters, patch))
                }
            />

            {customRows.length > 0 ? (
                <div
                    className="flex shrink-0 flex-nowrap items-end gap-x-2 gap-y-2"
                    aria-label="Custom field filters"
                >
                    {customRows.map((row, idx) => (
                        <CustomDimensionToolbarSelect
                            key={`${row.field}-${row.scope ?? 'lead'}-${idx}-${row.value}`}
                            dashboardId={dashboardId}
                            filters={filters}
                            filterOptions={filterOptions}
                            row={row}
                            rowIndex={idx}
                            label={
                                filterOptions.custom_filter_field_labels[row.field] ?? row.field
                            }
                        />
                    ))}
                </div>
            ) : null}

            <div className="flex shrink-0 flex-col gap-0.5">
                <span className="whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                    Date range
                </span>
                <DashboardDateRangePicker
                    dateFrom={filters.date_from}
                    dateTo={filters.date_to}
                    align="end"
                    ariaLabelContext="Reporting period"
                    triggerClassName={cn(
                        'h-8 shrink-0 justify-start gap-1.5 border-input bg-card px-2.5 text-left text-xs font-normal shadow-sm sm:h-9 sm:text-sm',
                        'min-w-0 max-w-[12rem] sm:max-w-[18rem]',
                    )}
                    onApply={(range) =>
                        visitDashboardWithFilters(dashboardId, mergeDashboardFilters(filters, range))
                    }
                />
            </div>
            <div className="flex shrink-0 items-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1 border-input bg-card px-2.5 text-xs font-medium shadow-sm sm:h-9"
                    onClick={handleSaveFilters}
                    disabled={saving}
                    aria-label="Save dashboard filters"
                >
                    <Save className="size-3.5 shrink-0" aria-hidden="true" />
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </div>
    );
}
