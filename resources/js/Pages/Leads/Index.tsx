import { PaginationBar } from '@/components/integrations/PaginationBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { LeadsIndexPageProps } from '@/types';
import type {
    LeadListRow,
    LeadRequestRow,
    LeadSourceOption,
    LeadsFilters,
    LeadsTab,
} from '@/types/leads';
import axios from 'axios';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { AlertCircle, Loader2, Search, Upload, Users } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

function leadImportAxiosMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 419) {
            return 'Your session expired. Refresh this page and try the import again.';
        }
        if (status === 429) {
            return 'Too many upload requests at once. Wait a minute, refresh the page, and try again.';
        }
        if (status === 413) {
            return 'One chunk was larger than the server allows. Ask your admin to raise PHP upload limits or lower LEAD_IMPORT_CHUNK_UPLOAD_KB.';
        }
        const d = err.response?.data;
        if (d && typeof d === 'object' && 'message' in d && typeof (d as { message: unknown }).message === 'string') {
            return (d as { message: string }).message;
        }
        if (d && typeof d === 'object' && 'errors' in d) {
            const errors = (d as { errors: Record<string, string[]> }).errors;
            const first = Object.values(errors)[0]?.[0];
            if (first) {
                return first;
            }
        }
        if (err.code === 'ERR_NETWORK') {
            return 'Network error while uploading a chunk. Check your connection and try again.';
        }
    }
    return 'Import failed. Check your connection and try again.';
}

function formatTs(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    try {
        return format(parseISO(iso), 'MMM d, yyyy HH:mm');
    } catch {
        return iso;
    }
}

function statusClass(status: string | null | undefined): string {
    if (!status) {
        return 'text-muted-foreground';
    }
    if (status === 'processed') {
        return 'text-emerald-600';
    }
    if (status === 'failed') {
        return 'text-destructive';
    }
    if (status === 'processing' || status === 'received') {
        return 'text-amber-600';
    }
    return 'text-muted-foreground';
}

function buildIndexQuery(filters: LeadsFilters, overrides: Record<string, string | number | undefined> = {}) {
    const q: Record<string, string | number> = { tab: filters.tab };
    if (filters.source_id != null) {
        q.source_id = filters.source_id;
    }
    if (filters.from) {
        q.from = filters.from;
    }
    if (filters.to) {
        q.to = filters.to;
    }
    if (filters.q) {
        q.q = filters.q;
    }
    for (const [k, v] of Object.entries(overrides)) {
        if (v === undefined) {
            delete q[k];
        } else {
            q[k] = v;
        }
    }
    return q;
}

type Draft = {
    source_id: string;
    from: string;
    to: string;
    q: string;
};

function filtersToDraft(f: LeadsFilters): Draft {
    return {
        source_id: f.source_id != null ? String(f.source_id) : '',
        from: f.from ?? '',
        to: f.to ?? '',
        q: f.q ?? '',
    };
}

export default function LeadsIndex() {
    const { tab, sources, filters, leads, requests, flash, leadImport } = usePage<LeadsIndexPageProps>().props;
    const [draft, setDraft] = useState<Draft>(() => filtersToDraft(filters));
    const [navigating, setNavigating] = useState(false);
    const [chunkImportBusy, setChunkImportBusy] = useState(false);

    const importForm = useForm({
        integration_source_id: '',
        file: null as File | null,
    });

    const clearImportFileInput = () => {
        importForm.setData('file', null);
        const input = document.getElementById('lead-import-file') as HTMLInputElement | null;
        if (input) {
            input.value = '';
        }
    };

    const submitImport: FormEventHandler = (e) => {
        e.preventDefault();
        void runImport();
    };

    const runImport = async () => {
        importForm.clearErrors();

        const file = importForm.data.file;
        const sourceId = importForm.data.integration_source_id;
        if (!sourceId) {
            importForm.setError('integration_source_id', 'Select an integration source.');
            return;
        }
        if (!file) {
            importForm.setError('file', 'Choose a file to import.');
            return;
        }

        const extMatch = file.name.match(/\.([^.]+)$/i);
        const ext = (extMatch?.[1] ?? '').toLowerCase();
        if (!['json', 'csv', 'txt'].includes(ext)) {
            importForm.setError('file', 'Use a .csv, .json, or .txt file.');
            return;
        }

        const thresholdKb = leadImport?.chunkedThresholdKb ?? 1024;
        const chunkKb = leadImport?.chunkUploadKb ?? 2048;
        const useChunkedUpload = file.size > thresholdKb * 1024;
        const chunkAxiosConfig = { headers: { Accept: 'application/json' as const } };

        if (useChunkedUpload) {
            setChunkImportBusy(true);
            try {
                const startFd = new FormData();
                startFd.append('integration_source_id', sourceId);
                startFd.append('extension', ext);
                startFd.append('total_bytes', String(file.size));

                const { data: started } = await axios.post<{ upload_id: string }>(
                    route('leads.import.chunk.start'),
                    startFd,
                    chunkAxiosConfig,
                );
                const uploadId = started.upload_id;
                const chunkBytes = chunkKb * 1024;

                for (let offset = 0; offset < file.size; offset += chunkBytes) {
                    const slice = file.slice(offset, Math.min(offset + chunkBytes, file.size));
                    const pushFd = new FormData();
                    pushFd.append('upload_id', uploadId);
                    pushFd.append('chunk', slice, 'chunk.bin');
                    await axios.post(route('leads.import.chunk.push'), pushFd, chunkAxiosConfig);
                }

                const commitFd = new FormData();
                commitFd.append('upload_id', uploadId);
                commitFd.append('integration_source_id', sourceId);
                const { data: finished } = await axios.post<{ redirect: string }>(
                    route('leads.import.chunk.commit'),
                    commitFd,
                    chunkAxiosConfig,
                );
                clearImportFileInput();
                router.visit(finished.redirect);
            } catch (err) {
                importForm.setError('file', leadImportAxiosMessage(err));
            } finally {
                setChunkImportBusy(false);
            }
            return;
        }

        importForm.post(route('leads.import'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                clearImportFileInput();
            },
        });
    };

    useEffect(() => {
        setDraft(filtersToDraft(filters));
    }, [filters.source_id, filters.from, filters.to, filters.q, filters.tab]);

    const submitSearch: FormEventHandler = (e) => {
        e.preventDefault();
        const nextFilters: LeadsFilters = {
            tab,
            source_id: draft.source_id === '' ? null : Number(draft.source_id),
            from: draft.from === '' ? null : draft.from,
            to: draft.to === '' ? null : draft.to,
            q: draft.q.trim() === '' ? null : draft.q.trim(),
        };
        const pageKey = tab === 'leads' ? 'leads_page' : 'requests_page';
        router.get(route('leads.index'), buildIndexQuery(nextFilters, { [pageKey]: 1 }), {
            preserveState: true,
            onStart: () => setNavigating(true),
            onFinish: () => setNavigating(false),
        });
    };

    const resetFilters = () => {
        setDraft({ source_id: '', from: '', to: '', q: '' });
        router.get(
            route('leads.index'),
            { tab },
            {
                preserveState: true,
                onStart: () => setNavigating(true),
                onFinish: () => setNavigating(false),
            },
        );
    };

    const switchTab = (next: LeadsTab) => {
        if (next === tab) {
            return;
        }
        router.get(
            route('leads.index'),
            buildIndexQuery(
                {
                    ...filters,
                    tab: next,
                },
                { leads_page: 1, requests_page: 1 },
            ),
            {
                preserveState: true,
                onStart: () => setNavigating(true),
                onFinish: () => setNavigating(false),
            },
        );
    };

    const resultCount =
        tab === 'leads' ? (leads?.total ?? 0) : tab === 'requests' ? (requests?.total ?? 0) : null;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Users className="size-6 text-muted-foreground" />
                        <h2 className="text-xl font-semibold leading-tight text-foreground">Leads</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Parsed rows from your integrations (webhooks and API sync). Import CSV or JSON files on the{' '}
                        <strong className="font-medium text-foreground">Import</strong> tab, or use{' '}
                        <strong className="font-medium text-foreground">Inbound requests</strong> to audit raw
                        deliveries.
                    </p>
                </div>
            }
        >
            <Head title="Leads" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {flash?.success ? (
                    <div
                        className="rounded-lg border border-emerald-500/35 bg-emerald-500/[0.09] px-4 py-3 text-sm text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/[0.12] dark:text-emerald-50"
                        role="status"
                    >
                        {flash.success}
                    </div>
                ) : null}

                <Tabs value={tab} onValueChange={(v) => switchTab(v as LeadsTab)} className="w-full">
                    <TabsList className="inline-flex h-auto flex-wrap gap-1 rounded-lg bg-muted/60 p-1">
                        <TabsTrigger value="leads" className="rounded-md px-4 py-2">
                            Leads
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="rounded-md px-4 py-2">
                            Inbound requests
                        </TabsTrigger>
                        <TabsTrigger value="import" className="rounded-md px-4 py-2">
                            Import
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {tab === 'import' && (sources as LeadSourceOption[]).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-6 py-10 text-center">
                        <p className="text-sm font-medium text-foreground">No integration sources yet</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create a webhook or API source under Integrations, then return here to upload leads.
                        </p>
                        <Button asChild className="mt-4">
                            <Link href={route('integrations.index')}>Go to Integrations</Link>
                        </Button>
                    </div>
                ) : null}

                {tab === 'import' && (sources as LeadSourceOption[]).length > 0 ? (
                    <form
                        onSubmit={submitImport}
                        className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm"
                    >
                        <div className="flex gap-3">
                            <div className="mt-0.5 shrink-0 rounded-md bg-primary/10 p-2 text-primary">
                                <Upload className="size-5" aria-hidden />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <h3 className="text-base font-semibold text-foreground">Import leads from a file</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Rows are attached to one integration source and parsed the same way as webhook JSON:
                                    column keys become dimensions or measures (numbers stay numeric). For webhook
                                    sources, the integration&apos;s sample JSON and field list are updated from this
                                    file so you don&apos;t have to configure them first. Include{' '}
                                    <span className="font-mono text-xs text-foreground">external_id</span> when you want a
                                    stable id per row.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-md border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/[0.08] dark:text-amber-50">
                            <div className="flex gap-2">
                                <AlertCircle className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
                                <div className="space-y-2 leading-snug">
                                    <p>
                                        <span className="font-medium">CSV</span> — first row is the header; each
                                        following row is one lead. UTF‑8; use a comma or let Excel export standard CSV.
                                    </p>
                                    <p>
                                        <span className="font-medium">JSON</span> — a single object, an array of
                                        objects, or <span className="font-mono text-xs">records</span> /{' '}
                                        <span className="font-mono text-xs">data</span> (same as webhooks). Up to{' '}
                                        {(leadImport?.maxRows ?? 250000).toLocaleString()} rows; large files upload in
                                        smaller chunks automatically. Single-request cap about{' '}
                                        {leadImport?.maxUploadMb ?? 200}&nbsp;MB (see <span className="font-mono text-xs">lead_import</span>{' '}
                                        config / PHP <span className="font-mono text-xs">post_max_size</span>).
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="import-source">Integration source</Label>
                                <select
                                    id="import-source"
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={importForm.data.integration_source_id}
                                    onChange={(e) =>
                                        importForm.setData('integration_source_id', e.target.value)
                                    }
                                    required
                                >
                                    <option value="">Select a source…</option>
                                    {(sources as LeadSourceOption[]).map((s) => (
                                        <option key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                                {importForm.errors.integration_source_id ? (
                                    <p className="text-xs text-destructive">
                                        {importForm.errors.integration_source_id}
                                    </p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead-import-file">File (.csv, .json, or .txt)</Label>
                                <Input
                                    id="lead-import-file"
                                    type="file"
                                    accept=".csv,.json,.txt,text/csv,application/json,text/plain"
                                    className="h-11 cursor-pointer file:me-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] ?? null;
                                        importForm.setData('file', f);
                                    }}
                                />
                                {importForm.errors.file ? (
                                    <p className="text-xs text-destructive">{importForm.errors.file}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                            <Button type="submit" disabled={importForm.processing || chunkImportBusy}>
                                {importForm.processing || chunkImportBusy ? (
                                    <Loader2 className="me-2 size-4 animate-spin" />
                                ) : (
                                    <Upload className="me-2 size-4" />
                                )}
                                Import leads
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                After import you will be taken to the Leads tab filtered to this source.
                            </p>
                        </div>
                    </form>
                ) : null}

                {tab !== 'import' ? (
                    <form
                        onSubmit={submitSearch}
                        className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
                    >
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[12rem] flex-1 space-y-2">
                            <Label htmlFor="lead-source">Source</Label>
                            <select
                                id="lead-source"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={draft.source_id}
                                onChange={(e) => setDraft((d) => ({ ...d, source_id: e.target.value }))}
                            >
                                <option value="">All sources</option>
                                {(sources as LeadSourceOption[]).map((s) => (
                                    <option key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-[10rem] space-y-2">
                            <Label htmlFor="lead-from">From</Label>
                            <Input
                                id="lead-from"
                                type="date"
                                value={draft.from}
                                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                            />
                        </div>
                        <div className="min-w-[10rem] space-y-2">
                            <Label htmlFor="lead-to">To</Label>
                            <Input
                                id="lead-to"
                                type="date"
                                value={draft.to}
                                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                            />
                        </div>
                        <div className="min-w-[12rem] flex-[2] space-y-2">
                            <Label htmlFor="lead-q">Keyword</Label>
                            <Input
                                id="lead-q"
                                value={draft.q}
                                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                                placeholder="Search external id or any JSON field…"
                            />
                        </div>
                        <div className="flex gap-2 pb-0.5">
                            <Button type="submit" disabled={navigating}>
                                {navigating ? (
                                    <Loader2 className="me-1 size-4 animate-spin" />
                                ) : (
                                    <Search className="me-1 size-4" />
                                )}
                                Search
                            </Button>
                            <Button type="button" variant="outline" onClick={resetFilters} disabled={navigating}>
                                Reset
                            </Button>
                        </div>
                    </div>
                    </form>
                ) : null}

                {tab === 'leads' || tab === 'requests' ? (
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{resultCount}</span> result
                            {resultCount === 1 ? '' : 's'}
                        </p>
                    </div>
                ) : null}

                {tab === 'leads' && leads ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px] text-left text-sm">
                                <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">ID</th>
                                        <th className="px-3 py-2">Received</th>
                                        <th className="px-3 py-2">Record</th>
                                        <th className="px-3 py-2">Campaign</th>
                                        <th className="px-3 py-2">Supplier</th>
                                        <th className="px-3 py-2">Platform</th>
                                        <th className="px-3 py-2">Integration</th>
                                        <th className="px-3 py-2">External id</th>
                                        <th className="px-3 py-2">Delivery</th>
                                        <th className="px-3 py-2 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                                                <p>No leads match these filters.</p>
                                                <p className="mt-2 text-xs">
                                                    Send JSON to a webhook URL from Integrations, or sync an API
                                                    connector. If <strong className="text-foreground">Inbound requests</strong>{' '}
                                                    shows deliveries with 0 rows, post the webhook again—those older
                                                    deliveries were never parsed into lead rows.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        (leads.data as LeadListRow[]).map((row) => (
                                            <tr key={row.id} className="border-b border-border last:border-0">
                                                <td className="px-3 py-2 font-mono text-xs">
                                                    <Link
                                                        href={route('leads.show', row.id)}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                    >
                                                        {row.id}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                                    {formatTs(row.received_at)}
                                                </td>
                                                <td className="max-w-[14rem] px-3 py-2 text-foreground">
                                                    <Link
                                                        href={route('leads.show', row.id)}
                                                        className="line-clamp-2 break-words text-primary underline-offset-4 hover:underline"
                                                    >
                                                        {row.record_summary ?? '—'}
                                                    </Link>
                                                </td>
                                                <td className="max-w-[10rem] px-3 py-2 text-muted-foreground">
                                                    <span className="line-clamp-2 break-words">
                                                        {row.campaign ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="max-w-[10rem] px-3 py-2 text-muted-foreground">
                                                    <span className="line-clamp-2 break-words">
                                                        {row.supplier ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="max-w-[8rem] px-3 py-2 text-muted-foreground">
                                                    <span className="line-clamp-2 break-words">
                                                        {row.platform ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Link
                                                        href={route('integrations.index')}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                    >
                                                        {row.source_name ?? '—'}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                                                    {row.external_id ?? '—'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`text-xs font-medium ${statusClass(row.delivery_status)}`}>
                                                        {row.delivery_status ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-end">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <Button asChild size="sm">
                                                            <Link href={route('leads.show', row.id)}>View</Link>
                                                        </Button>
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={route('integrations.index')}>Source</Link>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {leads.last_page > 1 ? <PaginationBar paginator={leads} label="Leads" /> : null}
                    </div>
                ) : null}

                {tab === 'requests' && requests ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[880px] text-left text-sm">
                                <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">ID</th>
                                        <th className="px-3 py-2">When</th>
                                        <th className="px-3 py-2">Source</th>
                                        <th className="px-3 py-2">Direction</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">HTTP</th>
                                        <th className="px-3 py-2">Rows</th>
                                        <th className="px-3 py-2">Bytes</th>
                                        <th className="px-3 py-2">Note</th>
                                        <th className="px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                                                No inbound requests yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        (requests.data as LeadRequestRow[]).map((ev) => (
                                            <tr key={ev.id} className="border-b border-border last:border-0">
                                                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                                                    {ev.id}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                                    {formatTs(ev.created_at)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Link
                                                        href={route('integrations.index')}
                                                        className="text-primary underline-offset-4 hover:underline"
                                                    >
                                                        {ev.source_name ?? '—'}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">{ev.direction}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`text-xs font-medium ${statusClass(ev.status)}`}>
                                                        {ev.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {ev.http_status ?? '—'}
                                                </td>
                                                <td className="px-3 py-2">{ev.facts_created}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{ev.bytes_received}</td>
                                                <td className="max-w-xs px-3 py-2 text-xs text-muted-foreground">
                                                    {ev.error_message
                                                        ? ev.error_message.slice(0, 140)
                                                        : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-end">
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={route('integrations.index')}>Open</Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {requests.last_page > 1 ? (
                            <PaginationBar paginator={requests} label="Inbound requests" />
                        ) : null}
                    </div>
                ) : null}
            </div>
        </AuthenticatedLayout>
    );
}
