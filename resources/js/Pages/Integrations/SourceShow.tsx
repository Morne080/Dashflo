import { IntegrationFactsDataTable } from '@/components/integrations/IntegrationFactsDataTable';
import { PaginationBar } from '@/components/integrations/PaginationBar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { IntegrationSourceShowPageProps } from '@/types';
import type { IngestionEventDetailRow, LaravelPaginator } from '@/types/integrations';
import { SourceVerificationForm } from '@/Pages/Integrations/SourceVerificationForm';
import { Head, Link, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, FileJson, Loader2, Pencil } from 'lucide-react';
import { useCallback, useState } from 'react';

function formatTs(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    try {
        return format(parseISO(iso), 'MMM d, yyyy HH:mm:ss');
    } catch {
        return iso;
    }
}

export default function IntegrationSourceShow() {
    const { source, events, facts, flash } = usePage<IntegrationSourceShowPageProps>().props;

    const [payloadOpen, setPayloadOpen] = useState(false);
    const [payloadEventId, setPayloadEventId] = useState<number | null>(null);
    const [payloadLoading, setPayloadLoading] = useState(false);
    const [payloadText, setPayloadText] = useState<string | null>(null);
    const [payloadMeta, setPayloadMeta] = useState<{ truncated: boolean; total_bytes: number } | null>(null);
    const [payloadError, setPayloadError] = useState<string | null>(null);

    const openPayload = useCallback(
        async (eventId: number) => {
            setPayloadEventId(eventId);
            setPayloadOpen(true);
            setPayloadLoading(true);
            setPayloadText(null);
            setPayloadMeta(null);
            setPayloadError(null);
            try {
                const url = route('integrations.sources.events.payload', {
                    integration_source: source.id,
                    ingestion_event: eventId,
                });
                const res = await fetch(url, {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                const json = (await res.json()) as {
                    content: string | null;
                    truncated: boolean;
                    total_bytes: number;
                    message?: string | null;
                };
                if (!res.ok) {
                    setPayloadError(json.message || 'Could not load payload.');
                    return;
                }
                if (json.message && !json.content) {
                    setPayloadError(json.message);
                    return;
                }
                setPayloadText(json.content ?? '');
                setPayloadMeta({ truncated: json.truncated, total_bytes: json.total_bytes });
            } catch {
                setPayloadError('Network error while loading payload.');
            } finally {
                setPayloadLoading(false);
            }
        },
        [source.id],
    );

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <Button asChild variant="ghost" size="sm" className="-ms-2 w-fit px-2 text-muted-foreground">
                        <Link href={route('integrations.index')}>
                            <ArrowLeft className="me-1 size-4" />
                            Integrations
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-foreground">{source.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            Review deliveries and the rows stored for dashboards.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`${source.name} · Data`} />

            <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {flash?.success ? (
                    <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                        {flash.success}
                    </div>
                ) : null}

                <div className="rounded-lg border border-border bg-card p-4 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2 text-muted-foreground">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                                {source.kind === 'webhook' ? 'Webhook' : 'API connector'}
                            </span>
                            <span>{source.enabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        {source.kind === 'webhook' ? (
                            <Button asChild variant="outline" size="sm" className="shrink-0">
                                <Link href={route('integrations.sources.edit', source.id)}>
                                    <Pencil className="me-1 size-4" />
                                    Edit webhook
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                    {source.webhook_url ? (
                        <p className="mt-2 break-all font-mono text-xs text-foreground">{source.webhook_url}</p>
                    ) : (
                        <p className="mt-2 font-mono text-xs text-foreground">
                            {(source.rest.base_url || '—') + (source.rest.path || '')}
                        </p>
                    )}
                </div>

                <Tabs defaultValue="events">
                    <TabsList>
                        <TabsTrigger value="events">Deliveries</TabsTrigger>
                        <TabsTrigger value="facts">Stored rows</TabsTrigger>
                        <TabsTrigger value="verification">Verification</TabsTrigger>
                    </TabsList>

                    <TabsContent value="events" className="mt-4 space-y-0 focus-visible:outline-none">
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">When</th>
                                        <th className="px-3 py-2">Direction</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">HTTP</th>
                                        <th className="px-3 py-2">Rows</th>
                                        <th className="px-3 py-2">Bytes</th>
                                        <th className="px-3 py-2">Raw data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                                                No deliveries yet. Send a test POST to your webhook URL, or run
                                                &quot;Sync now&quot; for an API connector.
                                            </td>
                                        </tr>
                                    ) : (
                                        (events.data as IngestionEventDetailRow[]).map((ev) => (
                                            <tr key={ev.id} className="border-b border-border last:border-0">
                                                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                                    {formatTs(ev.created_at)}
                                                </td>
                                                <td className="px-3 py-2">{ev.direction}</td>
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
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {ev.http_status ?? '—'}
                                                </td>
                                                <td className="px-3 py-2">{ev.facts_created}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{ev.bytes_received}</td>
                                                <td className="px-3 py-2">
                                                    {ev.has_payload ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openPayload(ev.id)}
                                                        >
                                                            <FileJson className="me-1 size-4" />
                                                            View
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {events.last_page > 1 ? <PaginationBar paginator={events} label="Deliveries" /> : null}
                    </TabsContent>

                    <TabsContent value="facts" className="mt-4 space-y-0 focus-visible:outline-none">
                        <div className="overflow-hidden rounded-lg border border-border">
                            <IntegrationFactsDataTable
                                rows={facts.data}
                                formatWhen={formatTs}
                                emptyMessage="No rows stored yet from this source."
                            />
                            {facts.last_page > 1 ? <PaginationBar paginator={facts} label="Stored rows" /> : null}
                        </div>
                    </TabsContent>

                    <TabsContent value="verification" className="mt-4 focus-visible:outline-none">
                        <SourceVerificationForm />
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={payloadOpen} onOpenChange={setPayloadOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Raw payload {payloadEventId ? `#${payloadEventId}` : ''}</DialogTitle>
                        <DialogDescription>
                            This is what was received (pretty-printed JSON when possible). Large payloads are
                            truncated for the browser.
                        </DialogDescription>
                    </DialogHeader>
                    {payloadLoading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="size-8 animate-spin" />
                        </div>
                    ) : payloadError ? (
                        <p className="text-sm text-destructive">{payloadError}</p>
                    ) : (
                        <>
                            {payloadMeta ? (
                                <p className="text-xs text-muted-foreground">
                                    {payloadMeta.total_bytes.toLocaleString()} bytes
                                    {payloadMeta.truncated ? ' · showing first 50,000 characters' : ''}
                                </p>
                            ) : null}
                            <ScrollArea className="max-h-[60vh] rounded-md border border-border bg-muted/30 p-3">
                                <pre className="whitespace-pre-wrap break-all text-xs font-mono text-foreground">
                                    {payloadText}
                                </pre>
                            </ScrollArea>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
