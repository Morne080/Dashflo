import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { LeadsShowPageProps } from '@/types';
import type {
    LeadDetailCustomField,
    LeadDetailField,
    LeadFieldBag,
    LeadFieldEditRef,
    LeadShowOriginating,
    LeadShowPayload,
} from '@/types/leads';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Braces, Clipboard, Pencil, ShieldCheck, User, Users } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

function fieldId(edit: LeadFieldEditRef): string {
    return `${edit.bag}::${edit.key}`;
}

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

function isHttpUrl(s: string): boolean {
    return /^https?:\/\//i.test(s.trim());
}

function FieldValueText({ value }: { value: string }) {
    const t = value.trim();
    if (isHttpUrl(t)) {
        return (
            <a
                href={t}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm text-primary underline-offset-4 hover:underline"
            >
                {value}
            </a>
        );
    }
    return <span className="whitespace-pre-wrap break-words text-sm text-foreground">{value}</span>;
}

function FieldGridReadonly({ rows }: { rows: { label: string; value: string }[] }) {
    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">No fields in this section.</p>;
    }
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rows.map((row, idx) => (
                <div key={`${row.label}-${idx}`} className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="text-xs font-semibold text-muted-foreground">{row.label}</div>
                    <div className="mt-1.5">
                        <FieldValueText value={row.value} />
                    </div>
                </div>
            ))}
        </div>
    );
}

const headerBarClass =
    'flex items-center justify-between gap-3 bg-primary px-4 py-2.5 text-primary-foreground shadow-sm';
const headerActionClass =
    'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20';

function SectionCard({
    icon: Icon,
    title,
    action,
    children,
}: {
    icon: LucideIcon;
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className={headerBarClass}>
                <div className="flex items-center gap-2 font-semibold tracking-tight">
                    <Icon className="size-5 shrink-0 opacity-90" />
                    {title}
                </div>
                {action}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

function OriginatingBlock({ originating, payload }: { originating: LeadShowOriginating; payload: LeadShowPayload }) {
    const [copied, setCopied] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const onCopy = useCallback(async () => {
        if (!payload.content) {
            return;
        }
        setErr(null);
        const ok = await copyToClipboard(payload.content);
        setCopied(ok);
        if (!ok) {
            setErr('Could not copy to clipboard.');
        }
        setTimeout(() => setCopied(false), 2000);
    }, [payload.content]);

    return (
        <SectionCard
            icon={Braces}
            title="Originating request"
            action={
                payload.content ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={headerActionClass}
                        onClick={() => void onCopy()}
                    >
                        <Clipboard className="me-1 size-4" />
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                ) : null
            }
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="text-xs font-semibold text-muted-foreground">Endpoint</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{originating.endpoint_label}</div>
                    <div className="mt-2 break-all font-mono text-xs text-muted-foreground">{originating.endpoint_value}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="text-xs font-semibold text-muted-foreground">{originating.connector_label}</div>
                    <div className="mt-1">
                        <Link
                            href={originating.connector_href}
                            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                            {originating.connector_name}
                        </Link>
                    </div>
                </div>
            </div>
            {payload.message && !payload.content ? (
                <p className="mt-4 text-sm text-muted-foreground">{payload.message}</p>
            ) : null}
            {payload.content ? (
                <>
                    <p className="mt-4 text-xs text-muted-foreground">
                        {payload.total_bytes.toLocaleString()} bytes
                        {payload.truncated ? ` · showing first ${payload.content.length.toLocaleString()} characters` : ''}
                    </p>
                    {err ? <p className="mt-1 text-xs text-destructive">{err}</p> : null}
                    <div className="mt-2 max-h-[min(60vh,560px)] overflow-auto rounded-md border border-border bg-muted/30 p-3">
                        <pre className="whitespace-pre-wrap break-all text-xs font-mono text-foreground">
                            {payload.content}
                        </pre>
                    </div>
                </>
            ) : null}
        </SectionCard>
    );
}

function buildDraftFromStandard(standard: LeadDetailField[]): Record<string, string> {
    const d: Record<string, string> = {};
    for (const row of standard) {
        if (row.edit) {
            const id = fieldId(row.edit);
            d[id] = row.value === '—' ? '' : row.value;
        }
    }
    return d;
}

function buildDraftFromCustom(custom: LeadDetailCustomField[]): Record<string, string> {
    const d: Record<string, string> = {};
    for (const row of custom) {
        const id = `${row.bag}::${row.storage_key}`;
        d[id] = row.value === '—' ? '' : row.value;
    }
    return d;
}

export default function LeadsShow() {
    const page = usePage<LeadsShowPageProps>();
    const { lead, standard_fields, custom_fields, originating, payload, flash } = page.props;

    const standardRows = standard_fields as LeadDetailField[];
    const customRows = custom_fields as LeadDetailCustomField[];

    const [editingStandard, setEditingStandard] = useState(false);
    const [editingCustom, setEditingCustom] = useState(false);
    const [standardDraft, setStandardDraft] = useState<Record<string, string>>({});
    const [customDraft, setCustomDraft] = useState<Record<string, string>>({});

    const form = useForm<{ fields: { bag: LeadFieldBag; key: string; value: string }[] }>({
        fields: [],
    });

    const readonlyStandardRows = useMemo(
        () => standardRows.map((r) => ({ label: r.label, value: r.value })),
        [standardRows],
    );

    const readonlyCustomRows = useMemo(
        () => customRows.map((r) => ({ label: r.key, value: r.value })),
        [customRows],
    );

    const canEditStandard = useMemo(() => standardRows.some((r) => r.edit != null), [standardRows]);

    const titleLine = lead.record_summary?.trim() || `Lead #${lead.id}`;

    const patchFields = (fields: { bag: LeadFieldBag; key: string; value: string }[]) => {
        form.setData('fields', fields);
        form.patch(route('leads.update', lead.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingStandard(false);
                setEditingCustom(false);
            },
        });
    };

    const saveStandard = () => {
        const fields = standardRows
            .filter((r): r is LeadDetailField & { edit: LeadFieldEditRef } => r.edit != null)
            .map((r) => ({
                bag: r.edit.bag,
                key: r.edit.key,
                value: standardDraft[fieldId(r.edit)] ?? '',
            }));
        patchFields(fields);
    };

    const saveCustom = () => {
        const fields = customRows.map((r) => ({
            bag: r.bag,
            key: r.storage_key,
            value: customDraft[`${r.bag}::${r.storage_key}`] ?? '',
        }));
        patchFields(fields);
    };

    const cancelStandard = () => {
        setEditingStandard(false);
        setStandardDraft({});
        form.clearErrors();
    };

    const cancelCustom = () => {
        setEditingCustom(false);
        setCustomDraft({});
        form.clearErrors();
    };

    const beginStandardEdit = () => {
        setStandardDraft(buildDraftFromStandard(standardRows));
        setEditingStandard(true);
    };

    const beginCustomEdit = () => {
        setCustomDraft(buildDraftFromCustom(customRows));
        setEditingCustom(true);
    };

    const formErrorSummary = useMemo(() => {
        const vals = Object.values(form.errors);
        return vals.filter(Boolean).join(' ');
    }, [form.errors]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3">
                    <Button asChild variant="ghost" size="sm" className="-ms-2 w-fit px-2 text-muted-foreground">
                        <Link href={route('leads.index')}>
                            <ArrowLeft className="me-1 size-4" />
                            Leads
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-foreground">{titleLine}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Lead #{lead.id}
                            {lead.external_id ? (
                                <>
                                    {' '}
                                    · External id <span className="font-mono text-foreground">{lead.external_id}</span>
                                </>
                            ) : null}
                            {' · '}
                            <Link
                                href={route('integrations.index')}
                                className="text-primary underline-offset-4 hover:underline"
                            >
                                {lead.source.name}
                            </Link>
                            {lead.received_at ? <> · Received {formatTs(lead.received_at)}</> : null}
                            {lead.delivery_status ? (
                                <>
                                    {' '}
                                    · Status <span className="text-foreground">{lead.delivery_status}</span>
                                </>
                            ) : null}
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`${titleLine} · Lead`} />

            <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-16 sm:px-6 lg:px-8">
                {flash?.success ? (
                    <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                        {flash.success}
                    </div>
                ) : null}

                {formErrorSummary ? (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {formErrorSummary}
                    </div>
                ) : null}

                {lead.verifications != null ? (
                    <SectionCard icon={ShieldCheck} title="Verification results">
                        <p className="mb-3 text-xs text-muted-foreground">
                            Twilio lookup, email DNS, and TrustedForm retain outcomes stored with this lead row.
                        </p>
                        <div className="max-h-[min(50vh,420px)] overflow-auto rounded-md border border-border bg-muted/30 p-3">
                            <pre className="whitespace-pre-wrap break-words text-xs font-mono text-foreground">
                                {JSON.stringify(lead.verifications, null, 2)}
                            </pre>
                        </div>
                    </SectionCard>
                ) : null}

                <SectionCard
                    icon={User}
                    title="Standard fields"
                    action={
                        editingStandard ? (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={headerActionClass}
                                    disabled={form.processing}
                                    onClick={cancelStandard}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                                    disabled={form.processing}
                                    onClick={saveStandard}
                                >
                                    Save
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={headerActionClass}
                                disabled={!canEditStandard || editingCustom}
                                onClick={beginStandardEdit}
                            >
                                <Pencil className="me-1 size-4" />
                                Edit
                            </Button>
                        )
                    }
                >
                    {editingStandard ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {standardRows.map((row) => {
                                if (!row.edit) {
                                    return (
                                        <div key={row.label} className="rounded-md border border-border bg-muted/30 p-3">
                                            <div className="text-xs font-semibold text-muted-foreground">{row.label}</div>
                                            <div className="mt-1.5">
                                                <FieldValueText value={row.value} />
                                            </div>
                                        </div>
                                    );
                                }
                                const edit = row.edit;
                                const fid = fieldId(edit);
                                return (
                                    <div key={fid} className="rounded-md border border-border bg-muted/40 p-3">
                                        <label htmlFor={fid} className="text-xs font-semibold text-muted-foreground">
                                            {row.label}
                                        </label>
                                        <Textarea
                                            id={fid}
                                            className="mt-2 min-h-[5rem] resize-y font-mono text-sm"
                                            value={standardDraft[fid] ?? ''}
                                            onChange={(e) =>
                                                setStandardDraft((prev) => ({
                                                    ...prev,
                                                    [fid]: e.target.value,
                                                }))
                                            }
                                            rows={3}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <FieldGridReadonly rows={readonlyStandardRows} />
                    )}
                </SectionCard>

                <SectionCard
                    icon={Users}
                    title="Custom fields"
                    action={
                        editingCustom ? (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={headerActionClass}
                                    disabled={form.processing}
                                    onClick={cancelCustom}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                                    disabled={form.processing}
                                    onClick={saveCustom}
                                >
                                    Save
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={headerActionClass}
                                disabled={editingStandard || customRows.length === 0}
                                onClick={beginCustomEdit}
                            >
                                <Pencil className="me-1 size-4" />
                                Edit
                            </Button>
                        )
                    }
                >
                    {editingCustom ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {customRows.map((row) => {
                                const id = `${row.bag}::${row.storage_key}`;
                                return (
                                    <div key={id} className="rounded-md border border-border bg-muted/40 p-3">
                                        <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
                                            {row.key}
                                        </label>
                                        <Textarea
                                            id={id}
                                            className="mt-2 min-h-[5rem] resize-y font-mono text-sm"
                                            value={customDraft[id] ?? ''}
                                            onChange={(e) =>
                                                setCustomDraft((prev) => ({
                                                    ...prev,
                                                    [id]: e.target.value,
                                                }))
                                            }
                                            rows={3}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <FieldGridReadonly rows={readonlyCustomRows} />
                    )}
                </SectionCard>

                <OriginatingBlock originating={originating as LeadShowOriginating} payload={payload as LeadShowPayload} />
            </div>
        </AuthenticatedLayout>
    );
}
