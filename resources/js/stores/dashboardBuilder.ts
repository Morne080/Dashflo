import type { DashboardFilters, DashboardWidgetPayload } from '@/types/dashboard';
import { filtersToPersistPayload } from '@/lib/persistDashboardFilters';
import { router } from '@inertiajs/react';
import { create } from 'zustand';
import type { Layout } from 'react-grid-layout';

/** Working widget row (includes resolved `data` for the grid preview). */
export type Widget = DashboardWidgetPayload;

function cloneWidgets(widgets: Widget[]): Widget[] {
    return structuredClone(widgets);
}

function stableWidgetSignature(widgets: Widget[]): string {
    return JSON.stringify(
        widgets.map((w) => ({
            id: w.id,
            widget_type: w.widget_type,
            metric_key: w.metric_key,
            title: w.title,
            config_json: w.config_json,
            filters_json: w.filters_json,
            layout_x: w.layout_x,
            layout_y: w.layout_y,
            layout_w: w.layout_w,
            layout_h: w.layout_h,
            sort_order: w.sort_order,
        })),
    );
}

function serializeForSync(widgets: Widget[]): Array<{
    id?: number;
    widget_type: string;
    metric_key: string;
    title: string | null;
    config_json: Record<string, unknown>;
    filters_json: Record<string, unknown>;
    layout_x: number;
    layout_y: number;
    layout_w: number;
    layout_h: number;
    sort_order: number;
}> {
    return widgets.map((w, index) => ({
        ...(typeof w.id === 'number' && w.id > 0 ? { id: w.id } : {}),
        widget_type: w.widget_type,
        metric_key: w.metric_key,
        title: w.title,
        config_json: w.config_json ?? {},
        filters_json: w.filters_json ?? {},
        layout_x: w.layout_x,
        layout_y: w.layout_y,
        layout_w: w.layout_w,
        layout_h: w.layout_h,
        sort_order: index,
    }));
}

export interface BuilderState {
    isEditMode: boolean;
    pendingChanges: boolean;
    /** Last server widgets when not editing (clone of Inertia props). */
    serverWidgets: Widget[];
    /** Snapshot at edit start (for discard). */
    snapshotWidgets: Widget[];
    widgets: Widget[];
    isSyncing: boolean;
    toggleEditMode: () => void;
    /** Current breakpoint layout from react-grid-layout (`Layout` = layout items). */
    updateLayout: (layout: Layout) => void;
    removeWidget: (id: string) => void;
    addWidget: (widget: Widget) => void;
    updateWidget: (id: string, patch: Partial<Widget>) => void;
    saveChanges: (dashboardId: number, toolbarFilters?: DashboardFilters) => Promise<void>;
    discardChanges: () => void;
    syncFromPage: (widgets: Widget[]) => void;
}

export const useDashboardBuilder = create<BuilderState>((set, get) => ({
    isEditMode: false,
    pendingChanges: false,
    serverWidgets: [],
    snapshotWidgets: [],
    widgets: [],
    isSyncing: false,

    syncFromPage: (widgets) => {
        if (get().isEditMode) {
            return;
        }
        const next = cloneWidgets(widgets);
        set({ serverWidgets: next, widgets: next });
    },

    toggleEditMode: () => {
        const s = get();
        if (!s.isEditMode) {
            const base = cloneWidgets(s.serverWidgets);
            set({
                isEditMode: true,
                widgets: base,
                snapshotWidgets: cloneWidgets(base),
                pendingChanges: false,
            });
            return;
        }
        if (s.pendingChanges) {
            return;
        }
        set({ isEditMode: false });
    },

    updateLayout: (layout) => {
        set((state) => {
            if (!state.isEditMode) {
                return state;
            }
            const byId = new Map([...layout].map((item) => [item.i, item]));
            const next = state.widgets.map((w) => {
                const item = byId.get(String(w.id));
                if (!item) {
                    return w;
                }
                return {
                    ...w,
                    layout_x: item.x,
                    layout_y: item.y,
                    layout_w: item.w,
                    layout_h: item.h,
                };
            });
            const pending =
                stableWidgetSignature(next) !== stableWidgetSignature(state.snapshotWidgets);
            return { widgets: next, pendingChanges: pending };
        });
    },

    removeWidget: (id) => {
        set((state) => {
            if (!state.isEditMode) {
                return state;
            }
            const next = state.widgets.filter((w) => String(w.id) !== id);
            const pending =
                stableWidgetSignature(next) !== stableWidgetSignature(state.snapshotWidgets);
            return { widgets: next, pendingChanges: pending };
        });
    },

    addWidget: (widget) => {
        set((state) => {
            if (!state.isEditMode) {
                return state;
            }
            const next = [...state.widgets, widget];
            const pending =
                stableWidgetSignature(next) !== stableWidgetSignature(state.snapshotWidgets);
            return { widgets: next, pendingChanges: pending };
        });
    },

    updateWidget: (id, patch) => {
        set((state) => {
            if (!state.isEditMode) {
                return state;
            }
            const next = state.widgets.map((w) =>
                String(w.id) === id ? { ...w, ...patch } : w,
            );
            const pending =
                stableWidgetSignature(next) !== stableWidgetSignature(state.snapshotWidgets);
            return { widgets: next, pendingChanges: pending };
        });
    },

    saveChanges: async (dashboardId, toolbarFilters) => {
        const { widgets } = get();
        set({ isSyncing: true });
        await new Promise<void>((resolve, reject) => {
            const payload: Record<string, unknown> = {
                widgets: serializeForSync(widgets),
            };
            if (toolbarFilters !== undefined) {
                payload.filters = filtersToPersistPayload(toolbarFilters);
            }
            router.post(
                route('dashboards.widgets.sync', { dashboard: dashboardId }),
                payload as Parameters<typeof router.post>[1],
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        set({
                            isEditMode: false,
                            pendingChanges: false,
                            snapshotWidgets: [],
                        });
                        resolve();
                    },
                    onError: () => {
                        reject(new Error('Failed to save dashboard widgets.'));
                    },
                    onFinish: () => {
                        set({ isSyncing: false });
                    },
                },
            );
        });
    },

    discardChanges: () => {
        set((state) => ({
            widgets: cloneWidgets(state.snapshotWidgets),
            pendingChanges: false,
            isEditMode: false,
        }));
    },
}));
