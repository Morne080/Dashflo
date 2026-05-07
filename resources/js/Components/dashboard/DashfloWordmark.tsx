import { cn } from '@/lib/utils';

export function DashfloWordmark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'bg-gradient-to-r from-sky-300 to-indigo-700 bg-clip-text text-lg font-bold tracking-tight text-transparent',
                className,
            )}
        >
            Dashflo
        </span>
    );
}
