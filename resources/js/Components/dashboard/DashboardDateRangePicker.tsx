import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
    endOfMonth,
    format,
    startOfDay,
    startOfMonth,
    startOfYear,
    subDays,
    subMonths,
} from 'date-fns';
import { CalendarRange } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

function parseLocalYmd(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function useWideEnoughForTwoMonths(): boolean {
    const [wide, setWide] = React.useState(() =>
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)').matches : true,
    );

    React.useEffect(() => {
        const mq = window.matchMedia('(min-width: 640px)');
        const handler = () => setWide(mq.matches);
        handler();
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return wide;
}

type Preset = { label: string; range: () => { from: Date; to: Date } };

function buildPresets(): Preset[] {
    const today = startOfDay(new Date());

    return [
        {
            label: 'This month',
            range: () => ({ from: startOfMonth(today), to: endOfMonth(today) }),
        },
        {
            label: 'Last month',
            range: () => {
                const m = subMonths(today, 1);
                return { from: startOfMonth(m), to: endOfMonth(m) };
            },
        },
        {
            label: 'Last 7 days',
            range: () => ({ from: subDays(today, 6), to: today }),
        },
        {
            label: 'Last 30 days',
            range: () => ({ from: subDays(today, 29), to: today }),
        },
        {
            label: 'Year to date',
            range: () => ({ from: startOfYear(today), to: today }),
        },
    ];
}

export type DashboardDateRangePickerProps = {
    dateFrom: string;
    dateTo: string;
    onApply: (range: { date_from: string; date_to: string }) => void;
    disabled?: boolean;
    align?: 'start' | 'end';
    triggerClassName?: string;
    /** Shown in aria-label before the formatted range. */
    ariaLabelContext?: string;
};

export function DashboardDateRangePicker({
    dateFrom,
    dateTo,
    onApply,
    disabled,
    align = 'end',
    triggerClassName,
    ariaLabelContext = 'Date range',
}: DashboardDateRangePickerProps) {
    const [open, setOpen] = React.useState(false);
    const twoMonths = useWideEnoughForTwoMonths();
    const presets = React.useMemo(() => buildPresets(), []);

    const selected: DateRange = React.useMemo(
        () => ({
            from: parseLocalYmd(dateFrom),
            to: parseLocalYmd(dateTo),
        }),
        [dateFrom, dateTo],
    );

    const label = `${format(selected.from!, 'MMM d')} – ${format(selected.to!, 'MMM d, yyyy')}`;

    /** Local selection while the popover is open; committed only via Apply. */
    const [draft, setDraft] = React.useState<DateRange | undefined>(() => ({
        from: parseLocalYmd(dateFrom),
        to: parseLocalYmd(dateTo),
    }));

    const syncDraftFromProps = React.useCallback(() => {
        setDraft({
            from: parseLocalYmd(dateFrom),
            to: parseLocalYmd(dateTo),
        });
    }, [dateFrom, dateTo]);

    const applyDraft = () => {
        if (!draft?.from || !draft?.to) {
            return;
        }
        onApply({
            date_from: format(draft.from, 'yyyy-MM-dd'),
            date_to: format(draft.to, 'yyyy-MM-dd'),
        });
        setOpen(false);
    };

    const canApply = Boolean(draft?.from && draft?.to);

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) {
                    syncDraftFromProps();
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-label={`${ariaLabelContext} ${label}. Open calendar to choose dates or presets, then apply.`}
                    className={triggerClassName}
                >
                    <CalendarRange className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto max-w-[min(100vw-1rem,42rem)] overflow-hidden p-0 sm:max-w-none"
                align={align}
                sideOffset={6}
            >
                <div className="border-b border-border px-3 py-2">
                    <p className="text-[11px] leading-snug text-muted-foreground">
                        Pick <span className="font-medium text-foreground">start</span>, then{' '}
                        <span className="font-medium text-foreground">end</span>, or a preset — then{' '}
                        <span className="font-medium text-foreground">Apply</span>.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {presets.map((p) => (
                            <Button
                                key={p.label}
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 shrink-0 px-2 text-[11px] font-medium"
                                disabled={disabled}
                                onClick={() => {
                                    const { from, to } = p.range();
                                    setDraft({ from, to });
                                }}
                            >
                                {p.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto p-1">
                    <Calendar
                        key={`${dateFrom}-${dateTo}-${open}`}
                        mode="range"
                        numberOfMonths={twoMonths ? 2 : 1}
                        defaultMonth={draft?.from ?? selected.from}
                        selected={draft}
                        onSelect={(range) => setDraft(range)}
                    />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-3 py-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="button" size="sm" disabled={disabled || !canApply} onClick={applyDraft}>
                        Apply
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
