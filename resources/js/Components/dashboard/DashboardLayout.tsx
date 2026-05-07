import { cn } from '@/lib/utils';

type DashboardLayoutProps = {
    children: React.ReactNode;
    className?: string;
};

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
    return (
        <div className={cn('min-h-full bg-background px-4 py-6 sm:px-6 lg:px-8', className)}>
            <div className="mx-auto w-full max-w-[1920px]">{children}</div>
        </div>
    );
}
