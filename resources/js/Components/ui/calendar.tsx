import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

import 'react-day-picker/style.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, ...props }: CalendarProps) {
    return (
        <DayPicker
            className={cn(
                // dashflo-calendar: see app.css — fixes range contrast on dark popovers (RDP v9 defaults use light lavender + inherit fg).
                'dashflo-calendar rounded-md border border-border bg-card p-2 text-foreground',
                className,
            )}
            {...props}
        />
    );
}
Calendar.displayName = 'Calendar';

export { Calendar };
