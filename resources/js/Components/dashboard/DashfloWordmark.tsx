import { cn } from '@/lib/utils';

export function DashfloWordmark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'text-lg font-bold tracking-tight text-primary',
                className,
            )}
        >
            Dashflo
        </span>
    );
}
