import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DashboardSummaryRow } from '@/types/dashboard';
import { Link } from '@inertiajs/react';
import { Check, ChevronsDown, LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';

type DashboardSwitcherProps = {
    currentId: number;
    currentName: string;
    dashboards: DashboardSummaryRow[];
};

export function DashboardSwitcher({ currentId, currentName, dashboards }: DashboardSwitcherProps) {
    const [open, setOpen] = useState(false);
    const mockupActive = route().current('dashboards.mockup');

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="h-9 min-w-[8.5rem] max-w-[11rem] justify-between gap-2 border-input bg-card px-2.5 text-left text-sm font-medium shadow-sm sm:min-w-[10rem] sm:max-w-[15rem] sm:px-3"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <LayoutGrid className="size-4 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">{currentName}</span>
                    </span>
                    <ChevronsDown className="size-4 shrink-0 opacity-50" aria-hidden />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-1" align="end">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Switch dashboard
                </div>
                <ul className="max-h-64 space-y-0.5 overflow-y-auto" role="listbox">
                    <li>
                        <Link
                            href={route('dashboards.mockup')}
                            preserveState
                            preserveScroll
                            onClick={() => setOpen(false)}
                            className={cn(
                                'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                                mockupActive && 'bg-muted/80',
                            )}
                        >
                            <span className="min-w-0 flex-1 truncate">Static mockup</span>
                            <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                Demo
                            </span>
                            {mockupActive ? (
                                <Check className="size-4 shrink-0 text-primary" aria-label="Current" />
                            ) : null}
                        </Link>
                    </li>
                    {dashboards.map((d) => (
                        <li key={d.id}>
                            <Link
                                href={route('dashboards.show', d.id)}
                                preserveState
                                preserveScroll
                                onClick={() => setOpen(false)}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                                    d.id === currentId && 'bg-muted/80',
                                )}
                            >
                                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                                {d.is_default ? (
                                    <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                                        Default
                                    </span>
                                ) : null}
                                {d.id === currentId ? (
                                    <Check className="size-4 shrink-0 text-primary" aria-label="Current" />
                                ) : null}
                            </Link>
                        </li>
                    ))}
                </ul>
                <div className="mt-1 border-t border-border pt-1">
                    <Link
                        href={route('dashboards.index')}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <Plus className="size-4 shrink-0" aria-hidden />
                        New dashboard
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
