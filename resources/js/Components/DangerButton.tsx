import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

export default function DangerButton({
    className = '',
    disabled,
    children,
    type = 'button',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button
            type={type}
            variant="destructive"
            disabled={disabled}
            className={cn(
                'px-4 py-2 text-xs font-semibold uppercase tracking-widest',
                disabled && 'opacity-25',
                className,
            )}
            {...props}
        >
            {children}
        </Button>
    );
}
