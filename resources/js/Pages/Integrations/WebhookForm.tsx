import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { WebhookFormPageProps } from '@/types';
import type { WebhookEditorPayload, WebhookFieldRow } from '@/types/integrations';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Braces, CheckCircle2, Loader2, Play, Sparkles, Wand2 } from 'lucide-react';
import { useCallback, useState } from 'react';

const CATEGORIES: { value: string; label: string }[] = [
    { value: 'lead_capture', label: 'Lead capture' },
    { value: 'lead_valid_invalid', label: 'Lead valid / invalid' },
    { value: 'lead_sold_unsold', label: 'Lead sold / unsold' },
    { value: 'custom', label: 'Custom' },
];

const TIMEZONES = [
    { value: '', label: 'Default (server)' },
    { value: 'America/Chicago', label: 'America/Chicago' },
    { value: 'America/Denver', label: 'America/Denver' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
    { value: 'America/New_York', label: 'America/New_York' },
    { value: 'America/Phoenix', label: 'America/Phoenix' },
    { value: 'Europe/London', label: 'Europe/London' },
    { value: 'UTC', label: 'UTC' },
];

const TAG_HELP = [
    '{email}',
    '{phone1}',
    '{trustedform_url}',
    '{firstname}',
    '{lastname}',
    '{city}',
    '{state}',
    '{zip}',
    '{ip_address}',
    '{user_agent}',
];

function sectionTitle(text: string) {
    return <h3 className="text-sm font-semibold tracking-tight text-foreground">{text}</h3>;
}

export default function WebhookForm() {
    const page = usePage<WebhookFormPageProps>();
    const { mode, source, default_webhook, flash } = page.props;

    const initialWebhook: WebhookEditorPayload =
        source?.webhook ?? default_webhook ?? ({} as WebhookEditorPayload);

    const form = useForm({
        name: source?.name ?? '',
        kind: 'webhook' as const,
        enabled: source?.enabled ?? true,
        webhook: initialWebhook,
    });

    const [jsonError, setJsonError] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);

    const validatePayloadSync = (): boolean => {
        const raw = form.data.webhook.sample_payload.trim();
        if (raw === '') {
            setJsonError('Payload is empty.');
            return false;
        }
        try {
            JSON.parse(raw);
            setJsonError(null);
            return true;
        } catch {
            setJsonError('Invalid JSON.');
            return false;
        }
    };

    const beautifyJson = useCallback(() => {
        try {
            const parsed = JSON.parse(form.data.webhook.sample_payload);
            form.setData('webhook', {
                ...form.data.webhook,
                sample_payload: JSON.stringify(parsed, null, 2),
            });
            setJsonError(null);
        } catch {
            setJsonError('Cannot beautify — fix JSON first.');
        }
    }, [form]);

    const runTest = useCallback(async () => {
        if (mode !== 'edit' || !source) {
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            let body = form.data.webhook.sample_payload.trim();
            if (body === '') {
                body = '{}';
            }
            try {
                JSON.parse(body);
            } catch {
                setTestResult('Sample payload is not valid JSON. Fix it before testing.');
                return;
            }
            const res = await fetch(source.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body,
                credentials: 'omit',
            });
            const text = await res.text();
            setTestResult(`${res.status} ${res.statusText}\n\n${text.slice(0, 2000)}`);
        } catch (e) {
            setTestResult(e instanceof Error ? e.message : 'Request failed.');
        } finally {
            setTesting(false);
        }
    }, [form.data.webhook.sample_payload, mode, source]);

    const updateRow = (index: number, patch: Partial<WebhookFieldRow>) => {
        const rows = form.data.webhook.field_rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
        form.setData('webhook', { ...form.data.webhook, field_rows: rows });
    };

    const addRow = () => {
        form.setData('webhook', {
            ...form.data.webhook,
            field_rows: [
                ...form.data.webhook.field_rows,
                { label: 'CUSTOM', 'incoming_key': '', static_value: '' },
            ],
        });
    };

    const removeRow = (index: number) => {
        form.setData('webhook', {
            ...form.data.webhook,
            field_rows: form.data.webhook.field_rows.filter((_, i) => i !== index),
        });
    };

    const submit: React.FormEventHandler = (e) => {
        e.preventDefault();
        if (!validatePayloadSync()) {
            return;
        }
        if (mode === 'create') {
            form.post(route('integrations.sources.store'));
        } else if (source) {
            form.patch(route('integrations.sources.update', source.id));
        }
    };

    const title = mode === 'create' ? 'Add webhook' : 'Edit webhook';

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
                    <div className="flex flex-wrap items-center gap-2">
                        <Braces className="size-6 text-muted-foreground" />
                        <h2 className="text-xl font-semibold leading-tight text-foreground">{title}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Dashflo receives JSON at your ingest URL. Map incoming keys for verification and document the
                        shape your partners should POST.
                    </p>
                </div>
            }
        >
            <Head title={title} />

            <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {flash?.success ? (
                    <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                        {flash.success}
                    </div>
                ) : null}

                <form onSubmit={submit} className="space-y-6">
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        {sectionTitle('Webhook details')}
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="wh-name">Reference name</Label>
                                <Input
                                    id="wh-name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    required
                                    placeholder="e.g. LEGAL-MVA — Inbounds"
                                />
                                {form.errors.name ? <p className="text-xs text-destructive">{form.errors.name}</p> : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wh-cat">Type</Label>
                                <select
                                    id="wh-cat"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={form.data.webhook.category}
                                    onChange={(e) =>
                                        form.setData('webhook', { ...form.data.webhook, category: e.target.value })
                                    }
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wh-ver">Webhook version</Label>
                                <select
                                    id="wh-ver"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={form.data.webhook.webhook_version}
                                    onChange={(e) =>
                                        form.setData('webhook', { ...form.data.webhook, webhook_version: e.target.value })
                                    }
                                >
                                    <option value="1.0">1.0</option>
                                    <option value="1.6">1.6</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wh-cap">Capture method</Label>
                                <Input
                                    id="wh-cap"
                                    value={form.data.webhook.capture_method}
                                    onChange={(e) =>
                                        form.setData('webhook', { ...form.data.webhook, capture_method: e.target.value })
                                    }
                                    placeholder="e.g. POST JSON body"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wh-ptype">Payload type</Label>
                                <select
                                    id="wh-ptype"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={form.data.webhook.payload_type}
                                    onChange={(e) =>
                                        form.setData('webhook', { ...form.data.webhook, payload_type: e.target.value })
                                    }
                                >
                                    <option value="json">JSON</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label>Ingest URL (Dashflo)</Label>
                                {mode === 'edit' && source ? (
                                    <Input readOnly className="font-mono text-xs" value={source.webhook_url} />
                                ) : (
                                    <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                                        Save this webhook to generate your private ingest URL.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <p id="wh-method-label" className="text-sm font-medium leading-none text-foreground">
                                    Request method
                                </p>
                                <div
                                    id="wh-method"
                                    role="status"
                                    aria-labelledby="wh-method-label"
                                    className="flex h-10 w-full items-center rounded-md border border-border bg-muted px-3 text-sm font-medium text-foreground"
                                >
                                    POST
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Inbound ingest accepts POST requests to your URL.
                                </p>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 sm:col-span-2">
                                <div>
                                    <p className="text-sm font-medium text-foreground">Source enabled</p>
                                    <p className="text-xs text-muted-foreground">Disabled sources reject new deliveries.</p>
                                </div>
                                <Switch
                                    checked={form.data.enabled}
                                    onCheckedChange={(v) => form.setData('enabled', !!v)}
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="wh-desc">Description (optional)</Label>
                                <Textarea
                                    id="wh-desc"
                                    rows={2}
                                    value={form.data.webhook.description}
                                    onChange={(e) =>
                                        form.setData('webhook', { ...form.data.webhook, description: e.target.value })
                                    }
                                    placeholder="Internal notes for your team"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            {sectionTitle('Sample payload (for partners)')}
                            <div className="flex flex-wrap gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button type="button" variant="outline" size="sm">
                                            <Sparkles className="me-1 size-4" />
                                            Tag help
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 text-sm" align="end">
                                        <p className="mb-2 font-medium text-foreground">Placeholders</p>
                                        <p className="text-xs text-muted-foreground">
                                            Use in the sample JSON as documentation. Incoming POSTs should send real
                                            values (not these braces) unless your sender performs substitution.
                                        </p>
                                        <ul className="mt-2 max-h-48 list-inside list-disc overflow-y-auto font-mono text-xs text-foreground">
                                            {TAG_HELP.map((t) => (
                                                <li key={t}>{t}</li>
                                            ))}
                                        </ul>
                                    </PopoverContent>
                                </Popover>
                                <Button type="button" variant="outline" size="sm" onClick={() => void validatePayloadSync()}>
                                    Validate JSON
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={beautifyJson}>
                                    <Wand2 className="me-1 size-4" />
                                    Beautify JSON
                                </Button>
                            </div>
                        </div>
                        <Textarea
                            className="mt-3 min-h-[14rem] font-mono text-xs"
                            value={form.data.webhook.sample_payload}
                            onChange={(e) =>
                                form.setData('webhook', { ...form.data.webhook, sample_payload: e.target.value })
                            }
                            spellCheck={false}
                        />
                        {jsonError ? <p className="mt-2 text-xs text-destructive">{jsonError}</p> : null}
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        {sectionTitle('Field mapping')}
                        <p className="mt-1 text-xs text-muted-foreground">
                            Incoming JSON keys are flattened into dimensions. Set the key your vendor sends for each
                            logical field (used for verification and display).
                        </p>
                        <div className="mt-4 overflow-x-auto rounded-md border border-border">
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">Field</th>
                                        <th className="px-3 py-2">Incoming JSON key</th>
                                        <th className="px-3 py-2">Static value</th>
                                        <th className="w-10 px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.data.webhook.field_rows.map((row, idx) => (
                                        <tr key={`${row.label}-${idx}`} className="border-b border-border last:border-0">
                                            <td className="px-3 py-2">
                                                <Input
                                                    className="font-mono text-xs"
                                                    value={row.label}
                                                    onChange={(e) => updateRow(idx, { label: e.target.value })}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input
                                                    className="font-mono text-xs"
                                                    value={row.incoming_key}
                                                    onChange={(e) => updateRow(idx, { incoming_key: e.target.value })}
                                                    placeholder="key_in_json"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input
                                                    className="text-xs"
                                                    value={row.static_value}
                                                    onChange={(e) => updateRow(idx, { static_value: e.target.value })}
                                                    placeholder="Optional override"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-end">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-muted-foreground"
                                                    onClick={() => removeRow(idx)}
                                                >
                                                    ×
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addRow}>
                            Add field row
                        </Button>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="wh-enc">Encryption type</Label>
                                <select
                                    id="wh-enc"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={form.data.webhook.encryption_type}
                                    onChange={(e) =>
                                        form.setData('webhook', { ...form.data.webhook, encryption_type: e.target.value })
                                    }
                                >
                                    <option value="">None</option>
                                    <option value="tls">TLS (HTTPS)</option>
                                    <option value="aes">AES (document only)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wh-tz">Output timezone</Label>
                                <select
                                    id="wh-tz"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={form.data.webhook.output_timezone}
                                    onChange={(e) =>
                                        form.setData('webhook', { ...form.data.webhook, output_timezone: e.target.value })
                                    }
                                >
                                    {TIMEZONES.map((z) => (
                                        <option key={z.value || 'default'} value={z.value}>
                                            {z.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center justify-between gap-3 sm:col-span-2">
                                <div>
                                    <p className="text-sm font-medium text-foreground">Custom headers</p>
                                    <p className="text-xs text-muted-foreground">
                                        Reserved for future sender header requirements.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.data.webhook.custom_headers_enabled}
                                    onCheckedChange={(v) =>
                                        form.setData('webhook', {
                                            ...form.data.webhook,
                                            custom_headers_enabled: !!v,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        {sectionTitle('Success response to sender')}
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="wh-resp-mode">Match by</Label>
                                <select
                                    id="wh-resp-mode"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={form.data.webhook.response_mode}
                                    onChange={(e) =>
                                        form.setData('webhook', {
                                            ...form.data.webhook,
                                            response_mode: e.target.value === 'plain' ? 'plain' : 'json',
                                        })
                                    }
                                >
                                    <option value="json">JSON (default)</option>
                                    <option value="plain">Plain text</option>
                                </select>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="wh-plain">Response body (plain text mode)</Label>
                                <Textarea
                                    id="wh-plain"
                                    rows={2}
                                    value={form.data.webhook.response_plain_body}
                                    onChange={(e) =>
                                        form.setData('webhook', {
                                            ...form.data.webhook,
                                            response_plain_body: e.target.value,
                                        })
                                    }
                                    placeholder="ACCEPTED"
                                />
                                <p className="text-xs text-muted-foreground">
                                    JSON mode always returns <code className="text-foreground">202</code> with{' '}
                                    <code className="text-foreground">message</code> and <code className="text-foreground">ingestion_event_id</code>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6">
                        {sectionTitle('Rules & transform')}
                        <p className="mt-2 text-sm text-muted-foreground">
                            Advanced routing and transform scripts are not configured here yet. Verification (Twilio,
                            email, TrustedForm) is managed under{' '}
                            <Link
                                href={source ? route('integrations.sources.show', source.id) : route('integrations.index')}
                                className="text-primary underline-offset-4 hover:underline"
                            >
                                source details
                            </Link>{' '}
                            and workspace defaults on Profile.
                        </p>
                    </div>

                    {testResult ? (
                        <div className="rounded-md border border-border bg-muted/30 p-4">
                            <p className="text-xs font-medium text-muted-foreground">Test result</p>
                            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground">
                                {testResult}
                            </pre>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? <Loader2 className="size-4 animate-spin" /> : null}
                            {mode === 'create' ? 'Save webhook' : 'Save changes'}
                        </Button>
                        {mode === 'edit' && source ? (
                            <Button type="button" variant="secondary" disabled={testing} onClick={() => void runTest()}>
                                {testing ? <Loader2 className="me-1 size-4 animate-spin" /> : <Play className="me-1 size-4" />}
                                Test POST
                            </Button>
                        ) : null}
                        <Button type="button" variant="outline" asChild>
                            <Link href={mode === 'edit' && source ? route('integrations.sources.show', source.id) : route('integrations.index')}>
                                Cancel
                            </Link>
                        </Button>
                        {mode === 'edit' && source ? (
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('integrations.sources.show', source.id)}>
                                    <CheckCircle2 className="me-1 size-4" />
                                    Deliveries &amp; rows
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
