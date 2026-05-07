import InputError from '@/Components/InputError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ProfileEditPageProps } from '@/types';
import type { LeadVerificationSettingsClient } from '@/types/integrations';
import { router, usePage } from '@inertiajs/react';
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

function buildState(account: LeadVerificationSettingsClient): FormState {
    return {
        twilio_lookup: {
            enabled: account.twilio_lookup.enabled,
            account_sid: account.twilio_lookup.account_sid,
            auth_token: '',
        },
        email_verification: {
            enabled: account.email_verification.enabled,
        },
        trustedform: {
            enabled: account.trustedform.enabled,
            api_key: '',
        },
    };
}

export default function AccountVerificationSettingsForm({ className = '' }: { className?: string }) {
    const { account_verifications } = usePage<ProfileEditPageProps>().props;
    const fp = useMemo(() => JSON.stringify(account_verifications), [account_verifications]);

    const [state, setState] = useState<FormState>(() => buildState(account_verifications));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setState(buildState(account_verifications));
        setErrors({});
    }, [fp]);

    const submit: React.FormEventHandler = (e) => {
        e.preventDefault();
        router.patch(
            route('profile.verification-settings.update'),
            {
                verifications: {
                    twilio_lookup: {
                        enabled: state.twilio_lookup.enabled,
                        account_sid: state.twilio_lookup.account_sid,
                        ...(state.twilio_lookup.auth_token.trim() !== ''
                            ? { auth_token: state.twilio_lookup.auth_token }
                            : {}),
                    },
                    email_verification: {
                        enabled: state.email_verification.enabled,
                    },
                    trustedform: {
                        enabled: state.trustedform.enabled,
                        ...(state.trustedform.api_key.trim() !== '' ? { api_key: state.trustedform.api_key } : {}),
                    },
                },
            },
            {
                preserveScroll: true,
                onStart: () => {
                    setProcessing(true);
                    setErrors({});
                },
                onFinish: () => setProcessing(false),
                onError: (errs) => setErrors(errs as Record<string, string>),
            },
        );
    };

    return (
        <section id="account-verification" className={className}>
            <header className="mb-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-muted-foreground" />
                    <h2 className="text-lg font-medium text-foreground">Lead verification (workspace defaults)</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                    Applies to every integration source that has &quot;Use workspace account defaults&quot; turned on.
                    Sources can still override Twilio / TrustedForm secrets only.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div className="rounded-md border border-border bg-background p-4">
                    <h3 className="text-sm font-semibold text-foreground">Twilio phone lookup</h3>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Enabled for all inheriting sources</span>
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
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="acct-tw-sid">Account SID</Label>
                            <Input
                                id="acct-tw-sid"
                                className="mt-1 font-mono text-xs"
                                value={state.twilio_lookup.account_sid}
                                onChange={(e) =>
                                    setState((s) => ({
                                        ...s,
                                        twilio_lookup: { ...s.twilio_lookup, account_sid: e.target.value },
                                    }))
                                }
                                autoComplete="off"
                            />
                            <InputError
                                message={errors['verifications.twilio_lookup.account_sid']}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="acct-tw-token">
                                Auth token{' '}
                                {account_verifications.twilio_lookup.auth_token_set
                                    ? '(saved — enter to replace)'
                                    : ''}
                            </Label>
                            <Input
                                id="acct-tw-token"
                                type="password"
                                className="mt-1 font-mono text-xs"
                                value={state.twilio_lookup.auth_token}
                                onChange={(e) =>
                                    setState((s) => ({
                                        ...s,
                                        twilio_lookup: { ...s.twilio_lookup, auth_token: e.target.value },
                                    }))
                                }
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-md border border-border bg-background p-4">
                    <h3 className="text-sm font-semibold text-foreground">Email legitimacy</h3>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">DNS / format checks</span>
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
                </div>

                <div className="rounded-md border border-border bg-background p-4">
                    <h3 className="text-sm font-semibold text-foreground">TrustedForm</h3>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Retain when certificate URL is present</span>
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
                    <div className="mt-4">
                        <Label htmlFor="acct-tf-key">
                            API key{' '}
                            {account_verifications.trustedform.api_key_set ? '(saved — enter to replace)' : ''}
                        </Label>
                        <Input
                            id="acct-tf-key"
                            type="password"
                            className="mt-1 font-mono text-xs"
                            value={state.trustedform.api_key}
                            onChange={(e) =>
                                setState((s) => ({
                                    ...s,
                                    trustedform: { ...s.trustedform, api_key: e.target.value },
                                }))
                            }
                            autoComplete="new-password"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button type="submit" disabled={processing}>
                        {processing ? <Loader2 className="size-4 animate-spin" /> : 'Save workspace verification'}
                    </Button>
                </div>
            </form>
        </section>
    );
}
