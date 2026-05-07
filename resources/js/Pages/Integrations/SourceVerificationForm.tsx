import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { IntegrationSourceShowPageProps } from '@/types';
import type { IntegrationSourceDetail, LeadVerificationSettingsClient } from '@/types/integrations';
import { Link, router, usePage } from '@inertiajs/react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type FormState = {
    twilio_lookup: {
        enabled: boolean;
        account_sid: string;
        auth_token: string;
    };
    email_verification: { enabled: boolean };
    trustedform: {
        enabled: boolean;
        api_key: string;
    };
};

function buildStateFromSource(source: IntegrationSourceDetail): FormState {
    return {
        twilio_lookup: {
            enabled: source.verifications.twilio_lookup.enabled,
            account_sid: source.verifications.twilio_lookup.account_sid,
            auth_token: '',
        },
        email_verification: {
            enabled: source.verifications.email_verification.enabled,
        },
        trustedform: {
            enabled: source.verifications.trustedform.enabled,
            api_key: '',
        },
    };
}

function buildStateFromEffective(effective: LeadVerificationSettingsClient): FormState {
    return {
        twilio_lookup: {
            enabled: effective.twilio_lookup.enabled,
            account_sid: effective.twilio_lookup.account_sid,
            auth_token: '',
        },
        email_verification: {
            enabled: effective.email_verification.enabled,
        },
        trustedform: {
            enabled: effective.trustedform.enabled,
            api_key: '',
        },
    };
}

function onOff(v: boolean): string {
    return v ? 'On' : 'Off';
}

export function SourceVerificationForm() {
    const { source, account_verifications, effective_verifications } = usePage<IntegrationSourceShowPageProps>().props;

    const verifFingerprint = useMemo(
        () =>
            JSON.stringify({
                v: source.verifications,
                a: account_verifications,
                e: effective_verifications,
            }),
        [source.verifications, account_verifications, effective_verifications],
    );

    const [inherit, setInherit] = useState(source.verifications.inherit_account_defaults);
    const [state, setState] = useState<FormState>(() => buildStateFromSource(source));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setInherit(source.verifications.inherit_account_defaults);
        setState(buildStateFromSource(source));
        setErrors({});
    }, [verifFingerprint]);

    const setInheritAndMaybeSeed = (next: boolean) => {
        setInherit(next);
        if (!next) {
            const seeded = buildStateFromEffective(effective_verifications);
            setState((prev) => ({
                ...seeded,
                twilio_lookup: { ...seeded.twilio_lookup, auth_token: prev.twilio_lookup.auth_token },
                trustedform: { ...seeded.trustedform, api_key: prev.trustedform.api_key },
            }));
        } else {
            setState(buildStateFromSource(source));
        }
    };

    const submit: React.FormEventHandler = (e) => {
        e.preventDefault();
        const base = {
            inherit_account_defaults: inherit,
            twilio_lookup: {
                account_sid: state.twilio_lookup.account_sid,
                ...(state.twilio_lookup.auth_token.trim() !== ''
                    ? { auth_token: state.twilio_lookup.auth_token }
                    : {}),
            },
            trustedform: {
                ...(state.trustedform.api_key.trim() !== '' ? { api_key: state.trustedform.api_key } : {}),
            },
        };

        const verifications = inherit
            ? {
                  ...base,
              }
            : {
                  ...base,
                  twilio_lookup: {
                      ...base.twilio_lookup,
                      enabled: state.twilio_lookup.enabled,
                  },
                  email_verification: {
                      enabled: state.email_verification.enabled,
                  },
                  trustedform: {
                      ...base.trustedform,
                      enabled: state.trustedform.enabled,
                  },
              };

        router.patch(route('integrations.sources.update', source.id), { verifications }, {
            preserveScroll: true,
            onStart: () => {
                setProcessing(true);
                setErrors({});
            },
            onFinish: () => setProcessing(false),
            onError: (errs) => setErrors(errs as Record<string, string>),
            onSuccess: () => {
                router.reload({
                    only: ['source', 'flash', 'account_verifications', 'effective_verifications'],
                });
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-8">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">After each inbound delivery</p>
                        <p>
                            Use <strong className="font-medium text-foreground">workspace defaults</strong> (Profile) so
                            every webhook or API source inherits the same checks. Turn that off here to configure this
                            source only.
                        </p>
                    </div>
                </div>
            </div>

            <section className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Use workspace account defaults</h3>
                        <p className="text-xs text-muted-foreground">
                            When on, Twilio / email / TrustedForm toggles follow your Profile settings. You can still set
                            optional credentials below for this source only.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{inherit ? 'On' : 'Off'}</span>
                        <Switch checked={inherit} onCheckedChange={(v) => setInheritAndMaybeSeed(!!v)} />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Edit workspace defaults:{' '}
                    <Link href={`${route('profile.edit')}#account-verification`} className="text-primary underline-offset-4 hover:underline">
                        Profile → Lead verification
                    </Link>
                    .
                </p>
            </section>

            {inherit ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Active checks for this source (from workspace)</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                        <li>Twilio lookup: {onOff(account_verifications.twilio_lookup.enabled)}</li>
                        <li>Email check: {onOff(account_verifications.email_verification.enabled)}</li>
                        <li>TrustedForm: {onOff(account_verifications.trustedform.enabled)}</li>
                    </ul>
                </div>
            ) : null}

            <section className="space-y-4 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Twilio phone lookup</h3>
                        <p className="text-xs text-muted-foreground">
                            {inherit
                                ? 'Optional: override Account SID / token for this source only.'
                                : 'Validates the first phone found on the lead via Twilio Lookup.'}
                        </p>
                    </div>
                    {!inherit ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Enabled</span>
                            <Switch
                                checked={state.twilio_lookup.enabled}
                                onCheckedChange={(v) =>
                                    setState((s) => ({
                                        ...s,
                                        twilio_lookup: { ...s.twilio_lookup, enabled: !!v },
                                    }))
                                }
                            />
                        </div>
                    ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="tw-sid">Account SID</Label>
                        <Input
                            id="tw-sid"
                            className="font-mono text-xs"
                            value={state.twilio_lookup.account_sid}
                            onChange={(e) =>
                                setState((s) => ({
                                    ...s,
                                    twilio_lookup: { ...s.twilio_lookup, account_sid: e.target.value },
                                }))
                            }
                            autoComplete="off"
                        />
                        {errors['verifications.twilio_lookup.account_sid'] ? (
                            <p className="text-xs text-destructive">{errors['verifications.twilio_lookup.account_sid']}</p>
                        ) : null}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tw-token">
                            Auth token{' '}
                            {source.verifications.twilio_lookup.auth_token_set ? '(saved — enter to replace)' : ''}
                        </Label>
                        <Input
                            id="tw-token"
                            type="password"
                            className="font-mono text-xs"
                            value={state.twilio_lookup.auth_token}
                            onChange={(e) =>
                                setState((s) => ({
                                    ...s,
                                    twilio_lookup: { ...s.twilio_lookup, auth_token: e.target.value },
                                }))
                            }
                            autoComplete="new-password"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    If SID/token are empty here, the app can fall back to <code className="text-foreground">TWILIO_ACCOUNT_SID</code> and{' '}
                    <code className="text-foreground">TWILIO_AUTH_TOKEN</code> from <code className="text-foreground">.env</code>.
                </p>
            </section>

            <section className="space-y-4 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Email legitimacy</h3>
                        <p className="text-xs text-muted-foreground">
                            {inherit
                                ? 'Controlled from workspace defaults while inherit is on.'
                                : 'RFC format + domain MX/A DNS check on the first email field.'}
                        </p>
                    </div>
                    {!inherit ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Enabled</span>
                            <Switch
                                checked={state.email_verification.enabled}
                                onCheckedChange={(v) =>
                                    setState((s) => ({
                                        ...s,
                                        email_verification: { enabled: !!v },
                                    }))
                                }
                            />
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="space-y-4 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">ActiveProspect TrustedForm</h3>
                        <p className="text-xs text-muted-foreground">
                            {inherit
                                ? 'Toggle follows workspace; API key here overrides for this source only.'
                                : 'When the lead includes a certificate URL, calls your configured retain endpoint.'}
                        </p>
                    </div>
                    {!inherit ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Enabled</span>
                            <Switch
                                checked={state.trustedform.enabled}
                                onCheckedChange={(v) =>
                                    setState((s) => ({
                                        ...s,
                                        trustedform: { ...s.trustedform, enabled: !!v },
                                    }))
                                }
                            />
                        </div>
                    ) : null}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tf-key">
                        API key {source.verifications.trustedform.api_key_set ? '(saved — enter to replace)' : ''}
                    </Label>
                    <Input
                        id="tf-key"
                        type="password"
                        className="font-mono text-xs"
                        value={state.trustedform.api_key}
                        onChange={(e) =>
                            setState((s) => ({
                                ...s,
                                trustedform: { ...s.trustedform, api_key: e.target.value },
                            }))
                        }
                        autoComplete="new-password"
                        placeholder="Bearer-capable API key"
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Fallback: <code className="text-foreground">TRUSTEDFORM_API_KEY</code> in <code className="text-foreground">.env</code>{' '}
                    when this field is empty.
                </p>
            </section>

            <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                    {processing ? <Loader2 className="size-4 animate-spin" /> : 'Save verification settings'}
                </Button>
            </div>
        </form>
    );
}
