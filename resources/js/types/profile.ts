import type { LeadVerificationSettingsClient } from './integrations';

export type ProfileEditProps = {
    mustVerifyEmail: boolean;
    status?: string;
    account_verifications: LeadVerificationSettingsClient;
} & Record<string, unknown>;
