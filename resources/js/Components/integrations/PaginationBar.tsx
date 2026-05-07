import { Button } from '@/components/ui/button';
import type { LaravelPaginator } from '@/types/integrations';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PaginationBar({
    paginator,
    label,
}: {
    paginator: LaravelPaginator<unknown>;
    label: string;
}) {
    return (
        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
                {label}: page {paginator.current_page} of {paginator.last_page} ({paginator.total} total)
            </p>
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!paginator.prev_page_url}
                    onClick={() => paginator.prev_page_url && router.get(paginator.prev_page_url)}
                >
                    <ChevronLeft className="size-4" />
                    Previous
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!paginator.next_page_url}
                    onClick={() => paginator.next_page_url && router.get(paginator.next_page_url)}
                >
                    Next
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
