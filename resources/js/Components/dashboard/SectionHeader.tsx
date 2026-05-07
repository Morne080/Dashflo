import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type SectionHeaderProps = {
    title: string;
    rightText?: string;
    /** Shown on the right (e.g. CSV export); kept on one row with `rightText` when space allows. */
    actions?: ReactNode;
    className?: string;
};

export function SectionHeader({ title, rightText, actions, className }: SectionHeaderProps) {
    return (
        <div className={cn('border-b border-primary pb-2', className)}>
            <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-end min-[480px]:justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {title}
                </h2>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    {rightText ? (
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {rightText}
                        </p>
                    ) : null}
                    {actions}
                </div>
            </div>
        </div>
    );
}
