import { DashboardDateRangePicker } from '@/components/dashboard/DashboardDateRangePicker';
import { mergeDashboardFilters, visitDashboardWithFilters } from '@/lib/dashboardFilterNavigation';
import { cn } from '@/lib/utils';
import type { DashboardFilters } from '@/types/dashboard';

type DashboardViewDateRangeProps = {
    dashboardId: number;
    filters: DashboardFilters;
    className?: string;
};

/**
 * View mode only: change reporting period without exposing dimension / custom filters.
 */
export function DashboardViewDateRange({ dashboardId, filters, className }: DashboardViewDateRangeProps) {
    return (
        <div className={cn('flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2', className)}>
            <div className="flex shrink-0 flex-col gap-0.5">
                <span className="whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                    Reporting period
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
        </div>
    );
}
