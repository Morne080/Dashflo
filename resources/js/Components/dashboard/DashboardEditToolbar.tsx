import { WidgetLibraryPanel } from '@/Components/dashboard/builder/WidgetLibraryPanel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AvailableWidgetDefinition } from '@/types/catalog';
import type { DashboardFilters, DashboardWidgetPayload } from '@/types/dashboard';
import { useDashboardBuilder } from '@/stores/dashboardBuilder';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

type DashboardEditToolbarProps = {
    pageWidgets: DashboardWidgetPayload[];
    dashboardId: number;
    toolbarFilters: DashboardFilters;
    availableWidgets: AvailableWidgetDefinition[] | undefined;
    onCatalogWidgetPick: (definition: AvailableWidgetDefinition) => void;
};

export function DashboardEditToolbar({
    pageWidgets,
    dashboardId,
    toolbarFilters,
    availableWidgets,
    onCatalogWidgetPick,
}: DashboardEditToolbarProps) {
    const isEditMode = useDashboardBuilder((s) => s.isEditMode);
    const pendingChanges = useDashboardBuilder((s) => s.pendingChanges);
    const isSyncing = useDashboardBuilder((s) => s.isSyncing);
    const toggleEditMode = useDashboardBuilder((s) => s.toggleEditMode);
    const discardChanges = useDashboardBuilder((s) => s.discardChanges);
    const saveChanges = useDashboardBuilder((s) => s.saveChanges);
    const syncFromPage = useDashboardBuilder((s) => s.syncFromPage);

    const [libraryOpen, setLibraryOpen] = useState(false);

    const handleEdit = () => {
        syncFromPage(pageWidgets);
        toggleEditMode();
    };

    const handleCancel = () => {
        if (pendingChanges) {
            const ok = window.confirm('Discard all unsaved dashboard changes?');
            if (!ok) {
                return;
            }
        }
        discardChanges();
    };

    const handleSave = async () => {
        try {
            await saveChanges(dashboardId, toolbarFilters);
        } catch {
            window.alert('Could not save dashboard. Please try again.');
        }
    };

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-end gap-2',
                isEditMode &&
                    'rounded-lg border-2 border-primary/50 bg-primary/15 px-3 py-2 shadow-sm ring-1 ring-primary/25',
            )}
        >
            <WidgetLibraryPanel
                open={libraryOpen}
                onOpenChange={setLibraryOpen}
                definitions={availableWidgets}
                onSelectType={onCatalogWidgetPick}
            />
            {!isEditMode ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleEdit}
                >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit Dashboard
                </Button>
            ) : (
                <>
                    {pendingChanges ? (
                        <span className="flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <span
                                className="inline-block size-2 animate-pulse rounded-full bg-amber-500"
                                aria-hidden="true"
                            />
                            Unsaved changes
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-muted-foreground">Editing layout</span>
                    )}
                    <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={isSyncing}
                        onClick={() => setLibraryOpen(true)}
                    >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Add Widget
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isSyncing}
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isSyncing || !pendingChanges}
                        onClick={handleSave}
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                                Saving…
                            </>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </>
            )}
        </div>
    );
}
