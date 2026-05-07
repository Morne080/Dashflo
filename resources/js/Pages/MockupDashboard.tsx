import { DashfloWordmark } from '@/Components/dashboard/DashfloWordmark';
import { DashboardDateRangePicker } from '@/components/dashboard/DashboardDateRangePicker';
import { DashboardLayout } from '@/Components/dashboard/DashboardLayout';
import { SectionHeader } from '@/Components/dashboard/SectionHeader';
import { WidgetRenderer } from '@/Components/dashboard/WidgetRenderer';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { mockupDashboardData } from '@/lib/mockupDashboardData';
import type { DashboardFilters, DashboardWidgetPayload } from '@/types/dashboard';
import { Head } from '@inertiajs/react';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

const SOURCE_OPTIONS = ['Google', 'Meta', 'TikTok', 'Organic'] as const;
const VERTICAL_OPTIONS = ['Mass Tort', 'Auto Accident', 'Social Security'] as const;
const BUYER_OPTIONS = ['BUY-ATLAS', 'BUY-SOUTH', 'BUY-WEST', 'BUY-MID'] as const;

function WidgetFrame({ widget }: { widget: DashboardWidgetPayload }) {
    return (
        <article className="rounded-xl border border-border/90 bg-card/35 p-3 shadow-sm">
            <WidgetRenderer widget={widget} data={widget.data} isEditMode={false} />
        </article>
    );
}

export default function MockupDashboard() {
    const title = mockupDashboardData.dashboard.name;
    const [filters, setFilters] = useState<DashboardFilters>(mockupDashboardData.filters);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedVerticals, setSelectedVerticals] = useState<string[]>([]);
    const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
    const [sourceOpen, setSourceOpen] = useState(false);
    const [verticalOpen, setVerticalOpen] = useState(false);
    const [buyerOpen, setBuyerOpen] = useState(false);

    const sourceLabel =
        selectedSources.length === 0
            ? 'All sources'
            : selectedSources.length === 1
              ? selectedSources[0]
              : `${selectedSources.length} sources selected`;
    const verticalLabel =
        selectedVerticals.length === 0
            ? 'All verticals'
            : selectedVerticals.length === 1
              ? selectedVerticals[0]
              : `${selectedVerticals.length} verticals selected`;
    const buyerLabel =
        selectedBuyers.length === 0
            ? 'All buyers'
            : selectedBuyers.length === 1
              ? selectedBuyers[0]
              : `${selectedBuyers.length} buyers selected`;

    const derived = useMemo(() => {
        const sourceFactorMap: Record<string, number> = {
            all: 1,
            google: 1.12,
            meta: 0.94,
            tiktok: 0.88,
            organic: 0.79,
        };
        const buyerFactorMap: Record<string, number> = {
            all: 1,
            'buy-atlas': 1.08,
            'buy-south': 0.96,
            'buy-west': 0.89,
            'buy-mid': 0.82,
        };
        const verticalFactorMap: Record<string, number> = {
            mass_tort: 1,
            auto_accident: 0.86,
            social_security: 0.74,
        };

        const from = new Date(filters.date_from);
        const to = new Date(filters.date_to);
        const dayMs = 24 * 60 * 60 * 1000;
        const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / dayMs) + 1);
        const dateFactor = Math.max(0.45, Math.min(1.1, days / 31));
        const sourceFactors =
            selectedSources.length > 0
                ? selectedSources.map((source) => sourceFactorMap[source.toLowerCase()] ?? 1)
                : [1];
        const sourceFactor =
            sourceFactors.reduce((acc, value) => acc + value, 0) / sourceFactors.length;
        const verticalFactors =
            selectedVerticals.length > 0
                ? selectedVerticals.map(
                      (vertical) =>
                          verticalFactorMap[vertical.toLowerCase().replace(/\s+/g, '_')] ?? 1,
                  )
                : [1];
        const verticalFactor =
            verticalFactors.reduce((acc, value) => acc + value, 0) / verticalFactors.length;
        const buyerFactors =
            selectedBuyers.length > 0
                ? selectedBuyers.map((buyer) => buyerFactorMap[buyer.toLowerCase()] ?? 1)
                : [1];
        const buyerFactor =
            buyerFactors.reduce((acc, value) => acc + value, 0) / buyerFactors.length;
        const factor = sourceFactor * buyerFactor * verticalFactor * dateFactor;

        const scale = (value: number): number =>
            Number((value * factor).toFixed(value >= 100 ? 0 : value >= 1 ? 2 : 4));

        const scaleRows = (rows: Record<string, unknown>[]) =>
            rows.map((row) =>
                Object.fromEntries(
                    Object.entries(row).map(([k, v]) => {
                        if (typeof v !== 'number') {
                            return [k, v];
                        }
                        if (k.includes('rate') || k.includes('margin')) {
                            return [k, Math.min(0.95, Number((v * (0.9 + factor * 0.1)).toFixed(3)))];
                        }
                        return [k, scale(v)];
                    }),
                ),
            );

        const mapWidgets = (widgets: DashboardWidgetPayload[]): DashboardWidgetPayload[] =>
            widgets.map((widget) => {
                if (widget.widget_type === 'kpi_card' && widget.data && typeof widget.data === 'object') {
                    const d = widget.data as {
                        value?: number;
                        percentChange?: number;
                        sparklineData?: Array<{ date: string; value: number; prev_value: number }>;
                    };
                    return {
                        ...widget,
                        data: {
                            ...d,
                            value: typeof d.value === 'number' ? scale(d.value) : d.value,
                            percentChange:
                                typeof d.percentChange === 'number'
                                    ? Number((d.percentChange * (0.9 + factor * 0.1)).toFixed(1))
                                    : d.percentChange,
                            sparklineData: Array.isArray(d.sparklineData)
                                ? d.sparklineData.map((p) => ({
                                      ...p,
                                      value: scale(p.value),
                                      prev_value: scale(p.prev_value),
                                  }))
                                : d.sparklineData,
                        },
                    };
                }

                if (Array.isArray(widget.data)) {
                    return {
                        ...widget,
                        data: scaleRows(widget.data as Record<string, unknown>[]),
                    };
                }

                if (widget.data && typeof widget.data === 'object' && Array.isArray((widget.data as { rows?: unknown }).rows)) {
                    const tableData = widget.data as {
                        rows: Record<string, unknown>[];
                        totalRow?: Record<string, unknown>;
                    };
                    return {
                        ...widget,
                        data: {
                            rows: scaleRows(tableData.rows),
                            totalRow: tableData.totalRow
                                ? scaleRows([tableData.totalRow])[0]
                                : undefined,
                        },
                    };
                }

                return widget;
            });

        const filterChips = [
            { label: 'Date range', value: `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}` },
            {
                label: 'Vertical',
                value: selectedVerticals.length === 0 ? 'All' : selectedVerticals.join(', '),
            },
            {
                label: 'Source',
                value: selectedSources.length === 0 ? 'All' : selectedSources.join(', '),
            },
            {
                label: 'Buyer',
                value: selectedBuyers.length === 0 ? 'All' : selectedBuyers.join(', '),
            },
            { label: 'Mode', value: 'Static demo data' },
        ];

        return {
            filterChips,
            executiveWidgets: mapWidgets(mockupDashboardData.executiveWidgets),
            showcaseWidgets: mapWidgets(mockupDashboardData.showcaseWidgets),
        };
    }, [filters, selectedSources, selectedVerticals, selectedBuyers]);

    return (
        <AuthenticatedLayout>
            <Head title={`${title} — Demo`}>
                <meta
                    head-key="dashflo-mockup-description"
                    name="description"
                    content="Static dashboard mockup for layout and widget demos."
                />
            </Head>

            <DashboardLayout className="space-y-6">
                <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <DashfloWordmark className="text-2xl" />
                        <span className="rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                            Static demo
                        </span>
                    </div>
                    <h1 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">
                        Executive mockup dashboard
                    </h1>
                    <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                        This page is intentionally static. It uses fake in-memory data to preview dashboard layout,
                        card hierarchy, chart styles, and table rendering without touching live metrics queries.
                    </p>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-0.5">
                            <span className="whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                                Reporting period
                            </span>
                            <DashboardDateRangePicker
                                dateFrom={filters.date_from}
                                dateTo={filters.date_to}
                                align="start"
                                ariaLabelContext="Mockup reporting period"
                                triggerClassName="h-9 min-w-[13rem] justify-start gap-1.5 border-input bg-background px-2.5 text-left text-sm font-normal shadow-sm"
                                onApply={(range) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        ...range,
                                    }))
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                                Vertical
                            </span>
                            <Popover open={verticalOpen} onOpenChange={setVerticalOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 w-[14rem] justify-between border-input bg-background px-2.5 text-left text-sm font-normal shadow-sm"
                                    >
                                        <span className="truncate">{verticalLabel}</span>
                                        <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[14rem] p-1" align="start">
                                    <button
                                        type="button"
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                                            selectedVerticals.length === 0 && 'bg-muted/80',
                                        )}
                                        onClick={() => setSelectedVerticals([])}
                                    >
                                        <span className="flex-1 text-left">All verticals</span>
                                        {selectedVerticals.length === 0 ? (
                                            <Check className="size-4 shrink-0 text-primary" />
                                        ) : null}
                                    </button>
                                    <div className="my-1 border-t border-border" />
                                    {VERTICAL_OPTIONS.map((vertical) => {
                                        const checked = selectedVerticals.includes(vertical);
                                        return (
                                            <button
                                                key={vertical}
                                                type="button"
                                                className={cn(
                                                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                                                    checked && 'bg-muted/80',
                                                )}
                                                onClick={() =>
                                                    setSelectedVerticals((prev) =>
                                                        prev.includes(vertical)
                                                            ? prev.filter((v) => v !== vertical)
                                                            : [...prev, vertical],
                                                    )
                                                }
                                            >
                                                <span className="flex-1 text-left">{vertical}</span>
                                                {checked ? (
                                                    <Check className="size-4 shrink-0 text-primary" />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                                Source
                            </span>
                            <Popover open={sourceOpen} onOpenChange={setSourceOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 w-[14rem] justify-between border-input bg-background px-2.5 text-left text-sm font-normal shadow-sm"
                                    >
                                        <span className="truncate">{sourceLabel}</span>
                                        <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[14rem] p-1" align="start">
                                    <button
                                        type="button"
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                                            selectedSources.length === 0 && 'bg-muted/80',
                                        )}
                                        onClick={() => setSelectedSources([])}
                                    >
                                        <span className="flex-1 text-left">All sources</span>
                                        {selectedSources.length === 0 ? (
                                            <Check className="size-4 shrink-0 text-primary" />
                                        ) : null}
                                    </button>
                                    <div className="my-1 border-t border-border" />
                                    {SOURCE_OPTIONS.map((source) => {
                                        const checked = selectedSources.includes(source);
                                        return (
                                            <button
                                                key={source}
                                                type="button"
                                                className={cn(
                                                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                                                    checked && 'bg-muted/80',
                                                )}
                                                onClick={() =>
                                                    setSelectedSources((prev) =>
                                                        prev.includes(source)
                                                            ? prev.filter((v) => v !== source)
                                                            : [...prev, source],
                                                    )
                                                }
                                            >
                                                <span className="flex-1 text-left">{source}</span>
                                                {checked ? (
                                                    <Check className="size-4 shrink-0 text-primary" />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                                Buyer
                            </span>
                            <Popover open={buyerOpen} onOpenChange={setBuyerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 w-[14rem] justify-between border-input bg-background px-2.5 text-left text-sm font-normal shadow-sm"
                                    >
                                        <span className="truncate">{buyerLabel}</span>
                                        <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[14rem] p-1" align="start">
                                    <button
                                        type="button"
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                                            selectedBuyers.length === 0 && 'bg-muted/80',
                                        )}
                                        onClick={() => setSelectedBuyers([])}
                                    >
                                        <span className="flex-1 text-left">All buyers</span>
                                        {selectedBuyers.length === 0 ? (
                                            <Check className="size-4 shrink-0 text-primary" />
                                        ) : null}
                                    </button>
                                    <div className="my-1 border-t border-border" />
                                    {BUYER_OPTIONS.map((buyer) => {
                                        const checked = selectedBuyers.includes(buyer);
                                        return (
                                            <button
                                                key={buyer}
                                                type="button"
                                                className={cn(
                                                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                                                    checked && 'bg-muted/80',
                                                )}
                                                onClick={() =>
                                                    setSelectedBuyers((prev) =>
                                                        prev.includes(buyer)
                                                            ? prev.filter((v) => v !== buyer)
                                                            : [...prev, buyer],
                                                    )
                                                }
                                            >
                                                <span className="flex-1 text-left">{buyer}</span>
                                                {checked ? (
                                                    <Check className="size-4 shrink-0 text-primary" />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {derived.filterChips.map((chip) => (
                            <span
                                key={chip.label}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                            >
                                <span className="font-medium text-foreground">{chip.label}:</span>
                                <span>{chip.value}</span>
                            </span>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Executive layout" rightText="STATIC PREVIEW" />
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                        {derived.executiveWidgets.map((widget) => {
                            const spanClass =
                                widget.widget_type === 'kpi_card'
                                    ? 'lg:col-span-3'
                                    : widget.widget_type === 'data_table'
                                      ? 'lg:col-span-12'
                                      : 'lg:col-span-6';
                            return (
                                <div key={String(widget.id)} className={spanClass}>
                                    <WidgetFrame widget={widget} />
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="space-y-4">
                    <SectionHeader title="Widget showcase" rightText="ALL CORE TYPES" />
                    <p className="text-sm text-muted-foreground">
                        Quick visual reference of each widget renderer type used by the dashboard builder.
                    </p>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {derived.showcaseWidgets.map((widget) => (
                            <div
                                key={String(widget.id)}
                                className={widget.widget_type === 'data_table' ? 'lg:col-span-2' : undefined}
                            >
                                <WidgetFrame widget={widget} />
                            </div>
                        ))}
                    </div>
                </section>
            </DashboardLayout>
        </AuthenticatedLayout>
    );
}
