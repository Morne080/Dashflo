import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Widget } from '@/stores/dashboardBuilder';
import { GripVertical, Settings, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

type EditableWidgetShellProps = {
    widget: Widget;
    isEditMode: boolean;
    onRemove: (id: string) => void;
    onConfigure: (widget: Widget) => void;
    children: ReactNode;
};

export function EditableWidgetShell({
    widget,
    isEditMode,
    onRemove,
    onConfigure,
    children,
}: EditableWidgetShellProps) {
    const id = String(widget.id);

    if (!isEditMode) {
        return <div className="h-full min-h-0 min-w-0">{children}</div>;
    }

    return (
        <div
            className={cn(
                'group/widget relative h-full min-h-0 min-w-0 overflow-hidden rounded-lg border-2 border-dashed border-primary/80 bg-card/60 shadow-[inset_0_0_0_1px_rgb(99_102_241/0.2)] ring-1 ring-primary/30',
            )}
        >
            <div className="absolute inset-x-0 top-0 z-20 flex h-10 items-center justify-between gap-2 border-b border-primary/35 bg-gradient-to-b from-card/98 to-card/90 px-1.5 shadow-sm backdrop-blur-sm">
                <div
                    className="dashflo-grid-drag-handle flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary shadow-sm active:cursor-grabbing"
                    title="Drag to move"
                >
                    <GripVertical className="size-4" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9 border border-primary/30 bg-card shadow-sm hover:bg-primary/10"
                        title="Configure widget"
                        onClick={() => onConfigure(widget)}
                    >
                        <Settings className="size-4 text-primary" aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9 border border-destructive/40 bg-card text-destructive shadow-sm hover:bg-destructive/10"
                        title="Remove widget"
                        onClick={() => onRemove(id)}
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>
            <div className="h-full min-h-0 min-w-0 overflow-auto pt-10">{children}</div>
        </div>
    );
}
