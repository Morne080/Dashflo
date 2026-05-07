import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IntegrationFactsDataTable } from '@/components/integrations/IntegrationFactsDataTable';
import { PaginationBar } from '@/components/integrations/PaginationBar';
import { cn } from '@/lib/utils';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { IntegrationsIndexPageProps } from '@/types';
import type {
    IntegrationFactIndexRow,
    IntegrationSourceKind,
    IntegrationSourceSummary,
} from '@/types/integrations';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    Ban,
    Cable,
    ChevronDown,
    Copy,
    Download,
    Eye,
    Globe,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    ScrollText,
    Trash2,
} from 'lucide-react';
import { FormEventHandler, useCallback, useMemo, useState } from 'react';

function formatTs(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    try {
        return format(parseISO(iso), 'dd/MM/yyyy HH:mm:ss');
    } catch {
        return iso;
    }
}

function formatShort(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    try {
        return format(parseISO(iso), 'MMM d, yyyy HH:mm');
    } catch {
        return iso;
    }
}

async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

function escapeCsvCell(value: string): string {
    if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function downloadSourcesCsv(rows: IntegrationSourceSummary[]): void {
    const header = ['Name', 'Kind', 'Enabled', 'Endpoint', 'Verification', 'Created', 'Created by'];
    const lines = rows.map((r) => {
        const endpoint =
            r.kind === 'webhook' ? r.webhook_url : `${r.rest.base_url || ''}${r.rest.path || ''}`.trim() || '—';
        return [
            escapeCsvCell(r.name),
            escapeCsvCell(r.kind === 'webhook' ? 'Webhook' : 'API connector'),
            escapeCsvCell(r.enabled ? 'Yes' : 'No'),
            escapeCsvCell(endpoint),
            escapeCsvCell(r.verification_summary),
            escapeCsvCell(r.created_at ? formatTs(r.created_at) : '—'),
            escapeCsvCell(r.created_by_name),
        ].join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashflo-sources-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function SourceActionsMenu({
    source,
    onDeleted,
    busy,
    setBusy,
}: {
    source: IntegrationSourceSummary;
    onDeleted: () => void;
    busy: boolean;
    setBusy: (busy: boolean, sourceId: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const patchEnabled = (enabled: boolean) => {
        setBusy(true, source.id);
        router.patch(
            route('integrations.sources.update', source.id),
            { enabled },
            {
                preserveScroll: true,
                onFinish: () => setBusy(false, source.id),
            },
        );
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1 px-2" disabled={busy}>
                    <MoreHorizontal className="size-4" />
                    <ChevronDown className="size-3 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="end">
                <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="sm" className="justify-start font-normal" asChild>
                        <Link href={route('integrations.sources.show', source.id)} onClick={() => setOpen(false)}>
                            <Eye className="me-2 size-4 opacity-70" />
                            View details
                        </Link>
                    </Button>
                    {source.kind === 'webhook' ? (
                        <Button variant="ghost" size="sm" className="justify-start font-normal" asChild>
                            <Link href={route('integrations.sources.edit', source.id)} onClick={() => setOpen(false)}>
                                <Pencil className="me-2 size-4 opacity-70" />
                                Edit webhook
                            </Link>
                        </Button>
                    ) : null}
                    {source.kind === 'webhook' ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-start font-normal"
                            onClick={async () => {
                                const ok = await copyText(source.webhook_url);
                                setCopied(ok);
                                setTimeout(() => setCopied(false), 2000);
                                setOpen(false);
                            }}
                        >
                            <Copy className="me-2 size-4 opacity-70" />
                            {copied ? 'Copied URL' : 'Copy webhook URL'}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-start font-normal"
                            disabled={busy}
                            onClick={() => {
                                setBusy(true, source.id);
                                router.post(
                                    route('integrations.sources.sync', source.id),
                                    {},
                                    {
                                        preserveScroll: true,
                                        onFinish: () => setBusy(false, source.id),
                                    },
                                );
                                setOpen(false);
                            }}
                        >
                            <Globe className="me-2 size-4 opacity-70" />
                            Sync now
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-start font-normal"
                        onClick={() => patchEnabled(!source.enabled)}
                    >
                        <Ban className="me-2 size-4 opacity-70" />
                        {source.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-start font-normal text-destructive hover:text-destructive"
                        disabled={busy}
                        onClick={() => {
                            if (!confirm(`Delete “${source.name}”? This cannot be undone.`)) {
                                return;
                            }
                            setBusy(true, source.id);
                            router.delete(route('integrations.sources.destroy', source.id), {
                                preserveScroll: true,
                                onFinish: () => {
                                    setBusy(false, source.id);
                                    onDeleted();
                                },
                            });
                            setOpen(false);
                        }}
                    >
                        <Trash2 className="me-2 size-4" />
                        Delete
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default function IntegrationsIndex() {
    const { sources, recentEvents, recentFacts, factsCount, flash } = usePage<IntegrationsIndexPageProps>().props;

    const [kindTab, setKindTab] = useState<'all' | IntegrationSourceKind>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(() => new Set());
    const [actionBusySourceId, setActionBusySourceId] = useState<number | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);

    const form = useForm({
        name: '',
        kind: 'rest_api' as IntegrationSourceKind,
        rest: {
            base_url: '',
            path: '',
            auth_header: 'Authorization',
            auth_value: '',
        },
    });

    const byKind = useMemo(() => {
        if (kindTab === 'all') {
            return sources;
        }
        return sources.filter((s) => s.kind === kindTab);
    }, [sources, kindTab]);

    const filteredRows = useMemo(() => {
        if (statusFilter === 'active') {
            return byKind.filter((s) => s.enabled);
        }
        if (statusFilter === 'inactive') {
            return byKind.filter((s) => !s.enabled);
        }
        return byKind;
    }, [byKind, statusFilter]);

    const activeCount = useMemo(() => byKind.filter((s) => s.enabled).length, [byKind]);
    const inactiveCount = useMemo(() => byKind.filter((s) => !s.enabled).length, [byKind]);

    const selectedInView = useMemo(
        () => filteredRows.filter((r) => selected.has(r.id)),
        [filteredRows, selected],
    );

    const allSelected = filteredRows.length > 0 && selectedInView.length === filteredRows.length;
    const someSelected = selectedInView.length > 0 && !allSelected;

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
            return;
        }
        setSelected(new Set(filteredRows.map((r) => r.id)));
    };

    const toggleOne = (id: number) => {
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(id)) {
                n.delete(id);
            } else {
                n.add(id);
            }
            return n;
        });
    };

    const clearSelection = useCallback(() => setSelected(new Set()), []);

    const runBulkDisable = useCallback(() => {
        const ids = selectedInView.map((r) => r.id);
        if (ids.length === 0) {
            return;
        }
        setBulkBusy(true);
        let i = 0;
        const next = () => {
            if (i >= ids.length) {
                setBulkBusy(false);
                clearSelection();
                router.reload({ only: ['sources'] });
                return;
            }
            const id = ids[i];
            i += 1;
            router.patch(
                route('integrations.sources.update', id),
                { enabled: false },
                {
                    preserveScroll: true,
                    onFinish: next,
                },
            );
        };
        next();
    }, [selectedInView, clearSelection]);

    const runBulkDelete = useCallback(() => {
        const rows = selectedInView;
        if (rows.length === 0) {
            return;
        }
        if (!confirm(`Delete ${rows.length} source(s)? This cannot be undone.`)) {
            return;
        }
        setBulkBusy(true);
        let i = 0;
        const next = () => {
            if (i >= rows.length) {
                setBulkBusy(false);
                clearSelection();
                router.reload({ only: ['sources'] });
                return;
            }
            const id = rows[i].id;
            i += 1;
            router.delete(route('integrations.sources.destroy', id), {
                preserveScroll: true,
                onFinish: next,
            });
        };
        next();
    }, [selectedInView, clearSelection]);

    const scrollToActivity = () => {
        document.getElementById('delivery-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();
        form.setData('kind', 'rest_api');
        form.post(route('integrations.sources.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                form.reset();
                form.setData('kind', 'rest_api');
                form.setData('rest', {
                    base_url: '',
                    path: '',
                    auth_header: 'Authorization',
                    auth_value: '',
                });
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Cable className="size-6 text-muted-foreground" />
                        <h2 className="text-xl font-semibold leading-tight text-foreground">Data sources</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Webhooks and API connectors. Manage endpoints, verification, and review deliveries below.
                    </p>
                </div>
            }
        >
            <Head title="Integrations" />

            <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
                {flash?.created_source_name ? (
                    <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                        Source <span className="font-medium">{flash.created_source_name}</span> was created.
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>
                        <span className="font-medium text-foreground">{sources.length}</span> sources
                    </span>
                    <span className="text-border">·</span>
                    <span>
                        <span className="font-medium text-foreground">{factsCount}</span> stored rows
                    </span>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="me-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</span>
                        <div className="inline-flex rounded-md bg-muted p-1">
                            {(
                                [
                                    { id: 'all' as const, label: 'All' },
                                    { id: 'webhook' as const, label: 'Webhooks' },
                                    { id: 'rest_api' as const, label: 'API' },
                                ] as const
                            ).map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        setKindTab(opt.id);
                                        clearSelection();
                                    }}
                                    className={cn(
                                        'rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                                        kindTab === opt.id
                                            ? 'bg-background text-foreground shadow'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="me-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Status
                        </span>
                        {(
                            [
                                { id: 'active' as const, label: 'Active', count: activeCount },
                                { id: 'inactive' as const, label: 'Inactive', count: inactiveCount },
                                { id: 'all' as const, label: 'All', count: byKind.length },
                            ] as const
                        ).map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(opt.id);
                                    clearSelection();
                                }}
                                className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    statusFilter === opt.id
                                        ? opt.id === 'active'
                                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                                            : opt.id === 'inactive'
                                              ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                              : 'border-primary/40 bg-primary/10 text-foreground'
                                        : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/60',
                                )}
                            >
                                {opt.label}
                                <span className="ms-1 tabular-nums opacity-80">({opt.count})</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
                        <Button type="button" variant="outline" size="sm" onClick={scrollToActivity}>
                            <ScrollText className="me-1 size-4" />
                            Delivery log
                        </Button>
                        <Button type="button" size="sm" asChild>
                            <Link href={route('integrations.sources.create')}>
                                <Plus className="me-1 size-4" />
                                Add webhook
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                form.setData('kind', 'rest_api');
                                setCreateOpen(true);
                            }}
                        >
                            <Globe className="me-1 size-4" />
                            Add API connector
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="w-10 px-3 py-3">
                                        <input
                                            type="checkbox"
                                            className="size-4 rounded border-input text-primary focus:ring-ring"
                                            checked={allSelected}
                                            ref={(el) => {
                                                if (el) {
                                                    el.indeterminate = someSelected;
                                                }
                                            }}
                                            onChange={toggleAll}
                                            aria-label="Select all"
                                        />
                                    </th>
                                    <th className="px-3 py-3">Source</th>
                                    <th className="px-3 py-3">Type</th>
                                    <th className="min-w-[14rem] px-3 py-3">Endpoint</th>
                                    <th className="whitespace-nowrap px-3 py-3">Created</th>
                                    <th className="px-3 py-3">Created by</th>
                                    <th className="px-3 py-3">Status</th>
                                    <th className="w-28 px-3 py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                                            No sources match these filters. Add a webhook or API connector to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((source) => (
                                        <tr key={source.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                            <td className="px-3 py-3 align-middle">
                                                <input
                                                    type="checkbox"
                                                    className="size-4 rounded border-input text-primary focus:ring-ring"
                                                    checked={selected.has(source.id)}
                                                    onChange={() => toggleOne(source.id)}
                                                    aria-label={`Select ${source.name}`}
                                                />
                                            </td>
                                            <td className="px-3 py-3 align-middle">
                                                <Link
                                                    href={route('integrations.sources.show', source.id)}
                                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                                >
                                                    {source.name}
                                                </Link>
                                            </td>
                                            <td className="max-w-[12rem] px-3 py-3 align-middle">
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                                                        {source.kind === 'webhook' ? 'Webhook' : 'API connector'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {source.verification_summary === '—' ? (
                                                            'No checks'
                                                        ) : (
                                                            <>
                                                                {source.verification_summary}
                                                                {source.inherits_workspace_verification ? (
                                                                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground/80">
                                                                        Workspace defaults
                                                                    </span>
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="max-w-[20rem] px-3 py-3 align-middle">
                                                {source.kind === 'webhook' ? (
                                                    <code className="block break-all text-xs text-foreground">{source.webhook_url}</code>
                                                ) : (
                                                    <span className="break-all font-mono text-xs text-muted-foreground">
                                                        GET {(source.rest.base_url || '—') + (source.rest.path || '')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3 align-middle text-muted-foreground">
                                                {formatTs(source.created_at)}
                                            </td>
                                            <td className="px-3 py-3 align-middle text-muted-foreground">{source.created_by_name}</td>
                                            <td className="px-3 py-3 align-middle">
                                                <span
                                                    className={cn(
                                                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                                        source.enabled
                                                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                                                            : 'bg-muted text-muted-foreground',
                                                    )}
                                                >
                                                    {source.enabled ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-end align-middle">
                                                <SourceActionsMenu
                                                    source={source}
                                                    onDeleted={() => router.reload({ only: ['sources'] })}
                                                    busy={actionBusySourceId !== null || bulkBusy}
                                                    setBusy={(b, sid) => setActionBusySourceId(b ? sid : null)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {selectedInView.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/20 px-4 py-3 text-sm">
                            <span className="text-muted-foreground">
                                With selected <span className="font-medium text-foreground">{selectedInView.length}</span>
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={bulkBusy}
                                onClick={runBulkDisable}
                            >
                                <Ban className="me-1 size-4" />
                                Disable
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={bulkBusy}
                                onClick={runBulkDelete}
                            >
                                <Trash2 className="me-1 size-4" />
                                Delete
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={bulkBusy}
                                onClick={() => downloadSourcesCsv(selectedInView)}
                            >
                                <Download className="me-1 size-4" />
                                Export CSV
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="ms-auto" onClick={clearSelection}>
                                Clear
                            </Button>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Imported rows</h3>
                        <p className="text-xs text-muted-foreground">
                            Parsed fields from every source, newest first. Each row is one stored fact.
                        </p>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border">
                        <IntegrationFactsDataTable
                            rows={recentFacts.data as IntegrationFactIndexRow[]}
                            showSourceColumn
                            linkSourceNames
                            formatWhen={formatShort}
                            emptyMessage="No imported rows yet. Send webhook JSON or run an API sync."
                        />
                        {recentFacts.last_page > 1 ? <PaginationBar paginator={recentFacts} label="Imported rows" /> : null}
                    </div>
                </div>

                <div id="delivery-activity" className="scroll-mt-24 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Delivery log</h3>
                    <div className="overflow-x-auto rounded-lg border border-border bg-card">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2">When</th>
                                    <th className="px-3 py-2">Source</th>
                                    <th className="px-3 py-2">Direction</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Rows</th>
                                    <th className="px-3 py-2">Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                                            No deliveries yet.
                                        </td>
                                    </tr>
                                ) : (
                                    recentEvents.map((ev) => (
                                        <tr key={ev.id} className="border-b border-border last:border-0">
                                            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                                {formatShort(ev.created_at)}
                                            </td>
                                            <td className="px-3 py-2">{ev.source_name ?? '—'}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{ev.direction}</td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={
                                                        ev.status === 'processed'
                                                            ? 'text-emerald-600'
                                                            : ev.status === 'failed'
                                                              ? 'text-destructive'
                                                              : 'text-muted-foreground'
                                                    }
                                                >
                                                    {ev.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">{ev.facts_created}</td>
                                            <td className="px-3 py-2 text-xs text-muted-foreground">
                                                {ev.error_message ? ev.error_message.slice(0, 120) : ev.http_status ?? '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add API connector</DialogTitle>
                        <DialogDescription>
                            Performs a GET on your endpoint and imports the JSON response. Use &quot;Add webhook&quot; for
                            inbound POST integrations.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="src-name">Name</Label>
                            <Input
                                id="src-name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="e.g. CRM nightly"
                                required
                            />
                            {form.errors.name ? <p className="text-xs text-destructive">{form.errors.name}</p> : null}
                        </div>

                        <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                                <div className="space-y-2">
                                    <Label htmlFor="base-url">Base URL</Label>
                                    <Input
                                        id="base-url"
                                        value={form.data.rest.base_url}
                                        onChange={(e) =>
                                            form.setData('rest', { ...form.data.rest, base_url: e.target.value })
                                        }
                                        placeholder="https://api.example.com"
                                        required
                                    />
                                    {form.errors['rest.base_url'] ? (
                                        <p className="text-xs text-destructive">{form.errors['rest.base_url']}</p>
                                    ) : null}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="path">Path (optional)</Label>
                                    <Input
                                        id="path"
                                        value={form.data.rest.path}
                                        onChange={(e) =>
                                            form.setData('rest', { ...form.data.rest, path: e.target.value })
                                        }
                                        placeholder="/v1/metrics.json"
                                    />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="auth-h">Auth header (optional)</Label>
                                        <Input
                                            id="auth-h"
                                            value={form.data.rest.auth_header}
                                            onChange={(e) =>
                                                form.setData('rest', { ...form.data.rest, auth_header: e.target.value })
                                            }
                                            placeholder="Authorization"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="auth-v">Auth value (optional)</Label>
                                        <Input
                                            id="auth-v"
                                            type="password"
                                            value={form.data.rest.auth_value}
                                            onChange={(e) =>
                                                form.setData('rest', { ...form.data.rest, auth_value: e.target.value })
                                            }
                                            placeholder="Bearer …"
                                        />
                                    </div>
                                </div>
                            </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
