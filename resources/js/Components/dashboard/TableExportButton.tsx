import { Button } from '@/components/ui/button';
import { filtersToQueryString } from '@/lib/dashboardFilters';
import type { DashboardPageProps } from '@/types/dashboard';
import { usePage } from '@inertiajs/react';
import { Download } from 'lucide-react';

export type DashboardExportTable =
    | 'daily_metrics'
    | 'buyers_performance'
    | 'suppliers_performance'
    | 'states_performance'
    | 'disposition_report'
    | 'injury_type'
    | 'accident_date'
    | 'treatment_time'
    | 'phone_verification'
    | 'utm_source'
    | 'source_breakdown';

type TableExportButtonProps = {
    table: DashboardExportTable;
    label?: string;
};

export function TableExportButton({
    table,
    label = 'Export CSV',
}: TableExportButtonProps) {
    const { filters } = usePage<DashboardPageProps>().props;
    const qs = filtersToQueryString(filters);
    const href = `${route('dashboard.export', { table })}?${qs}`;

    const tableLabel = table.replace(/_/g, ' ');

    return (
        <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" asChild>
            <a
                href={href}
                download
                aria-label={`${label}: download ${tableLabel} as CSV using current dashboard filters`}
            >
                <Download className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
            </a>
        </Button>
    );
}
