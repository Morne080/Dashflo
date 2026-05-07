import { buildPendingWidgetFromDefinition } from '@/Components/dashboard/builder/pendingWidget';
import { WidgetConfigModal } from '@/Components/dashboard/builder/WidgetConfigModal';
import { DashboardSwitcher } from '@/Components/dashboard/DashboardSwitcher';
import { DashfloWordmark } from '@/Components/dashboard/DashfloWordmark';
import { DashboardEditToolbar } from '@/Components/dashboard/DashboardEditToolbar';
import { DashboardLayout } from '@/Components/dashboard/DashboardLayout';
import { EditableWidgetShell } from '@/Components/dashboard/EditableWidgetShell';
import { DashboardViewDateRange } from '@/Components/dashboard/DashboardViewDateRange';
import { FilterBar } from '@/Components/dashboard/FilterBar';
import { SectionHeader } from '@/Components/dashboard/SectionHeader';
import { WidgetRenderer } from '@/Components/dashboard/WidgetRenderer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useDashboardBuilder, type Widget } from '@/stores/dashboardBuilder';
import type { AvailableWidgetDefinition } from '@/types/catalog';
import type { DashboardPageProps, DashboardWidgetPayload } from '@/types/dashboard';
import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../../css/dashboard-edit.css';

const GRID_BREAKPOINTS = { lg: 1200, md: 1200, sm: 1200, xs: 1200, xxs: 0 };
const GRID_COLS = { lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 };

const ROW_HEIGHT = 132;
const GRID_MARGIN: readonly [number, number] = [12, 12];

const SECTION_RIGHT = 'MTD PERFORMANCE';

function topRowIsAllKpis(widgets: DashboardWidgetPayload[]): boolean {
    const top = widgets.filter((w) => w.layout_y === 0);
    return top.length > 0 && top.every((w) => w.widget_type === 'kpi_card');
}

function layoutsForWidgets(
    widgets: DashboardWidgetPayload[],
    isEditMode: boolean,
): ResponsiveLayouts {
    const lg: Layout = widgets.map((w) => ({
        i: String(w.id),
        x: w.layout_x,
        y: w.layout_y,
        w: w.layout_w,
        h: w.layout_h,
        static: !isEditMode,
    }));
    return {
        lg,
        md: lg,
        sm: lg,
        xs: lg,
        xxs: lg,
    };
}

function DashboardWidgetGrid({
    displayWidgets,
    onConfigureWidget,
}: {
    displayWidgets: DashboardWidgetPayload[];
    onConfigureWidget: (widget: Widget) => void;
}) {
    const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });
    const isEditMode = useDashboardBuilder((s) => s.isEditMode);
    const updateLayout = useDashboardBuilder((s) => s.updateLayout);
    const removeWidget = useDashboardBuilder((s) => s.removeWidget);

    const layouts = useMemo(
        () => layoutsForWidgets(displayWidgets, isEditMode),
        [displayWidgets, isEditMode],
    );

    return (
        <div
            ref={containerRef as Ref<HTMLDivElement>}
            className={cn('w-full min-w-0', isEditMode && 'dashflo-edit-canvas')}
        >
            {mounted ? (
                <Responsive
                    width={width}
                    layouts={layouts}
                    breakpoints={GRID_BREAKPOINTS}
                    cols={GRID_COLS}
                    rowHeight={ROW_HEIGHT}
                    margin={GRID_MARGIN}
                    containerPadding={[0, 0]}
                    autoSize
                    dragConfig={
                        isEditMode
                            ? { enabled: true, handle: '.dashflo-grid-drag-handle', threshold: 4 }
                            : { enabled: false }
                    }
                    resizeConfig={isEditMode ? { enabled: true } : { enabled: false }}
                    onLayoutChange={(layout) => {
                        if (isEditMode) {
                            updateLayout(layout);
                        }
                    }}
                >
                    {displayWidgets.map((w) => (
                        <div key={String(w.id)} className="min-h-0 min-w-0">
                            <EditableWidgetShell
                                widget={w}
                                isEditMode={isEditMode}
                                onRemove={(id) => removeWidget(id)}
                                onConfigure={(widget) => onConfigureWidget(widget)}
                            >
                                <WidgetRenderer widget={w} data={w.data} isEditMode={isEditMode} />
                            </EditableWidgetShell>
                        </div>
                    ))}
                </Responsive>
            ) : null}
        </div>
    );
}

export default function Dashboard() {
    const {
        filters,
        filterOptions,
        widgets: pageWidgets,
        dashboard,
        dashboardSummaries = [],
        availableWidgets,
        availableMetrics,
        integration_sources_for_widgets = [],
    } = usePage<DashboardPageProps>().props;
    const isEditMode = useDashboardBuilder((s) => s.isEditMode);
    const draftWidgets = useDashboardBuilder((s) => s.widgets);
    const syncFromPage = useDashboardBuilder((s) => s.syncFromPage);
    const addWidget = useDashboardBuilder((s) => s.addWidget);
    const updateWidget = useDashboardBuilder((s) => s.updateWidget);

    const [widgetConfig, setWidgetConfig] = useState<{ mode: 'create' | 'edit'; widget: Widget } | null>(
        null,
    );

    const displayWidgets = isEditMode ? draftWidgets : pageWidgets;
    const showKpiSectionHeader = topRowIsAllKpis(displayWidgets);

    const handleCatalogWidgetPick = useCallback((definition: AvailableWidgetDefinition) => {
        const widgets = useDashboardBuilder.getState().widgets;
        const draft = buildPendingWidgetFromDefinition(definition, widgets);
        setWidgetConfig({ mode: 'create', widget: draft });
    }, []);

    const handleConfigureWidget = useCallback((widget: Widget) => {
        setWidgetConfig({ mode: 'edit', widget });
    }, []);

    useEffect(() => {
        if (!isEditMode) {
            syncFromPage(pageWidgets);
        }
    }, [pageWidgets, isEditMode, syncFromPage, dashboard.id]);

    useEffect(() => {
        const remove = router.on('before', (event) => {
            const { pendingChanges, isEditMode: editing, isSyncing } = useDashboardBuilder.getState();
            if (!editing || !pendingChanges || isSyncing) {
                return;
            }
            const url = String(event.detail.visit.url);
            if (url.includes('/widgets/sync')) {
                return;
            }
            const ok = window.confirm('You have unsaved dashboard changes. Leave without saving?');
            if (!ok) {
                event.preventDefault();
                return;
            }
            useDashboardBuilder.getState().discardChanges();
        });
        return remove;
    }, []);

    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            const { pendingChanges, isEditMode: editing } = useDashboardBuilder.getState();
            if (!editing || !pendingChanges) {
                return;
            }
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, []);

    return (
        <AuthenticatedLayout>
            <Head title={`${dashboard.name} — Performance`}>
                <meta
                    head-key="dashflo-meta-title"
                    name="description"
                    content="Dashflo — Performance Dashboard"
                />
            </Head>

            <DashboardLayout>
                <header className="mb-6 space-y-3 border-b border-border pb-4">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                            <DashfloWordmark />
                            <DashboardSwitcher
                                currentId={dashboard.id}
                                currentName={dashboard.name}
                                dashboards={dashboardSummaries}
                            />
                        </div>
                        <DashboardEditToolbar
                            pageWidgets={pageWidgets}
                            dashboardId={dashboard.id}
                            toolbarFilters={filters}
                            availableWidgets={availableWidgets}
                            onCatalogWidgetPick={handleCatalogWidgetPick}
                        />
                    </div>
                    <div className="min-w-0 -mx-1 px-1">
                        {isEditMode ? (
                            <div className="space-y-2">
                                <p className="text-[11px] leading-snug text-muted-foreground">
                                    Add or remove <span className="font-medium text-foreground">custom</span> filters
                                    (lead columns and integration fields) as dropdowns. Use{' '}
                                    <span className="font-medium text-foreground">Save</span> to store them with this
                                    dashboard layout.
                                </p>
                                <FilterBar
                                    dashboardId={dashboard.id}
                                    filters={filters}
                                    filterOptions={filterOptions}
                                />
                            </div>
                        ) : (
                            <DashboardViewDateRange dashboardId={dashboard.id} filters={filters} />
                        )}
                    </div>
                </header>

                <section
                    className={cn(
                        'mb-10 space-y-3 transition-[padding,background-color,border-color,box-shadow] duration-200',
                        isEditMode &&
                            'rounded-xl border-2 border-dashed border-primary/70 bg-primary/[0.08] p-4 shadow-[inset_0_1px_0_0_rgb(99_102_241/0.12)] ring-1 ring-primary/25 sm:p-5',
                    )}
                >
                    {showKpiSectionHeader ? (
                        <SectionHeader title="Key performance indicators" rightText={SECTION_RIGHT} />
                    ) : null}
                    {isEditMode ? (
                        <p className="text-center text-[11px] font-medium uppercase tracking-wider text-primary/90">
                            Edit layout — drag widgets by the grip, resize from the corner
                        </p>
                    ) : null}
                    <DashboardWidgetGrid
                        displayWidgets={displayWidgets}
                        onConfigureWidget={handleConfigureWidget}
                    />
                </section>

                <WidgetConfigModal
                    open={widgetConfig !== null}
                    mode={widgetConfig?.mode ?? 'create'}
                    widget={widgetConfig?.widget ?? null}
                    globalFilters={filters}
                    filterOptions={filterOptions}
                    availableMetrics={availableMetrics ?? []}
                    availableWidgets={availableWidgets ?? []}
                    integrationSourcesForWidgets={integration_sources_for_widgets}
                    onCancel={() => setWidgetConfig(null)}
                    onSave={(w) => {
                        setWidgetConfig((prev) => {
                            if (!prev) {
                                return null;
                            }
                            if (prev.mode === 'create') {
                                addWidget(w);
                            } else {
                                updateWidget(String(w.id), {
                                    metric_key: w.metric_key,
                                    title: w.title,
                                    config_json: w.config_json,
                                    filters_json: w.filters_json,
                                    data: w.data,
                                    metric_label: w.metric_label,
                                    export_table: w.export_table,
                                });
                            }
                            return null;
                        });
                    }}
                />
            </DashboardLayout>
        </AuthenticatedLayout>
    );
}
