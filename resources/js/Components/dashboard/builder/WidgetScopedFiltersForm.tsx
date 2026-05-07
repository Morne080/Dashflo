import { DashboardDateRangePicker } from '@/components/dashboard/DashboardDateRangePicker';
import { Button } from '@/components/ui/button';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { DashboardFilterOptions, DashboardFilters } from '@/types/dashboard';
import { RotateCcw } from 'lucide-react';
import * as React from 'react';
import { type Control, useWatch } from 'react-hook-form';

const ALL = '__all__';

export type WidgetConfigFormValues = {
    metric_key: string;
    title: string;
    inheritFilters: boolean;
    filtersOverride: DashboardFilters;
    config_json: Record<string, unknown>;
};

function optionalSelectValue(v: string | null): string {
    return v == null || v === '' ? ALL : v;
}

function mergeFilters(base: DashboardFilters, patch: Partial<DashboardFilters>): DashboardFilters {
    return { ...base, ...patch };
}

function FilterSelect({
    label,
    value,
    options,
    onChange,
    widthClass,
    disabled,
}: {
    label: string;
    value: string;
    options: string[];
    onChange: (next: string) => void;
    widthClass?: string;
    disabled?: boolean;
}) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1', widthClass)}>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </span>
            <Select value={value} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger
                    className="h-9 bg-transparent text-sm shadow-sm"
                    aria-label={`Widget filter: ${label}`}
                >
                    <SelectValue placeholder={`All ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>All</SelectItem>
                    {options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                            {opt}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

type WidgetScopedFiltersFormProps = {
    control: Control<WidgetConfigFormValues>;
    globalFilters: DashboardFilters;
    filterOptions: DashboardFilterOptions;
};

export function WidgetScopedFiltersForm({ control, globalFilters, filterOptions }: WidgetScopedFiltersFormProps) {
    const inheritFilters = useWatch({ control, name: 'inheritFilters' });

    return (
        <div className="space-y-4 pr-1">
            <FormField
                control={control}
                name="inheritFilters"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3">
                        <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Inherit from dashboard</FormLabel>
                            <FormDescription className="text-xs">
                                When enabled, this widget uses the same filters as the dashboard toolbar. Turn off to
                                override filters for this widget only.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                )}
            />

            <div
                className={cn(
                    'flex flex-wrap items-end gap-x-3 gap-y-3 rounded-lg border border-dashed border-border/80 p-3',
                    inheritFilters && 'pointer-events-none opacity-50',
                )}
            >
                <FormField
                    control={control}
                    name="filtersOverride"
                    render={({ field }) => {
                        const f = field.value as DashboardFilters;
                        const setF = (next: DashboardFilters) => field.onChange(next);
                        const disabled = inheritFilters;

                        return (
                            <>
                                        <FilterSelect
                                            label="Source"
                                            value={optionalSelectValue(f.source)}
                                            options={filterOptions.sources}
                                            disabled={disabled}
                                            onChange={(v) =>
                                                setF(mergeFilters(f, { source: v === ALL ? null : v }))
                                            }
                                            widthClass="w-[140px]"
                                        />
                                        <FilterSelect
                                            label="Status"
                                            value={optionalSelectValue(f.status)}
                                            options={filterOptions.statuses}
                                            disabled={disabled}
                                            onChange={(v) =>
                                                setF(mergeFilters(f, { status: v === ALL ? null : v }))
                                            }
                                            widthClass="w-[120px]"
                                        />
                                        <FilterSelect
                                            label="Vertical"
                                            value={optionalSelectValue(f.vertical)}
                                            options={filterOptions.verticals}
                                            disabled={disabled}
                                            onChange={(v) =>
                                                setF(mergeFilters(f, { vertical: v === ALL ? null : v }))
                                            }
                                            widthClass="w-[140px]"
                                        />
                                        <FilterSelect
                                            label="SOL"
                                            value={optionalSelectValue(f.sol)}
                                            options={filterOptions.accident_sols}
                                            disabled={disabled}
                                            onChange={(v) => setF(mergeFilters(f, { sol: v === ALL ? null : v }))}
                                            widthClass="w-[120px]"
                                        />
                                        <FilterSelect
                                            label="State"
                                            value={optionalSelectValue(f.state)}
                                            options={filterOptions.states}
                                            disabled={disabled}
                                            onChange={(v) =>
                                                setF(mergeFilters(f, { state: v === ALL ? null : v }))
                                            }
                                            widthClass="w-[100px]"
                                        />
                                        <FilterSelect
                                            label="Supplier"
                                            value={optionalSelectValue(f.supplier_code)}
                                            options={filterOptions.supplier_codes}
                                            disabled={disabled}
                                            onChange={(v) =>
                                                setF(
                                                    mergeFilters(f, {
                                                        supplier_code: v === ALL ? null : v,
                                                    }),
                                                )
                                            }
                                            widthClass="w-[140px]"
                                        />
                                        <FilterSelect
                                            label="Buyer"
                                            value={optionalSelectValue(f.buyer_code)}
                                            options={filterOptions.buyer_codes}
                                            disabled={disabled}
                                            onChange={(v) =>
                                                setF(
                                                    mergeFilters(f, {
                                                        buyer_code: v === ALL ? null : v,
                                                    }),
                                                )
                                            }
                                            widthClass="w-[140px]"
                                        />
                                        <div className="flex min-w-0 flex-col gap-1">
                                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Date range
                                            </span>
                                            <DashboardDateRangePicker
                                                dateFrom={f.date_from}
                                                dateTo={f.date_to}
                                                disabled={disabled}
                                                align="start"
                                                ariaLabelContext="Widget date range"
                                                triggerClassName={cn(
                                                    'h-9 min-w-[200px] justify-start gap-2 border-input bg-transparent text-left text-sm font-normal shadow-sm',
                                                )}
                                                onApply={(range) =>
                                                    setF(mergeFilters(f, range))
                                                }
                                            />
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-1">
                                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Actions
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={disabled}
                                                className="h-9 gap-1.5 border-input bg-transparent px-3 text-xs font-medium shadow-sm"
                                                onClick={() => setF({ ...globalFilters })}
                                                aria-label="Reset widget filters to match the dashboard"
                                            >
                                                <RotateCcw className="size-3.5 shrink-0" aria-hidden="true" />
                                                Match dashboard
                                            </Button>
                                        </div>
                                    </>
                        );
                    }}
                />
            </div>
        </div>
    );
}
