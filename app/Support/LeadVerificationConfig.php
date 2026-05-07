<?php

namespace App\Support;

/**
 * Normalizes Twilio / email / TrustedForm verification blocks from encrypted JSON.
 *
 * @phpstan-type TwilioBlock array{enabled: bool, account_sid: string, auth_token: string}
 * @phpstan-type EmailBlock array{enabled: bool}
 * @phpstan-type TrustedFormBlock array{enabled: bool, api_key: string}
 * @phpstan-type VerificationShape array{twilio_lookup: TwilioBlock, email_verification: EmailBlock, trustedform: TrustedFormBlock}
 */
final class LeadVerificationConfig
{
    /**
     * @param  array<string, mixed>|null  $root
     * @return VerificationShape
     */
    public static function fromSettingsRoot(?array $root): array
    {
        $v = is_array($root) ? $root : [];
        $twilio = is_array($v['twilio_lookup'] ?? null) ? $v['twilio_lookup'] : [];
        $email = is_array($v['email_verification'] ?? null) ? $v['email_verification'] : [];
        $tf = is_array($v['trustedform'] ?? null) ? $v['trustedform'] : [];

        return [
            'twilio_lookup' => [
                'enabled' => (bool) ($twilio['enabled'] ?? false),
                'account_sid' => (string) ($twilio['account_sid'] ?? ''),
                'auth_token' => (string) ($twilio['auth_token'] ?? ''),
            ],
            'email_verification' => [
                'enabled' => (bool) ($email['enabled'] ?? false),
            ],
            'trustedform' => [
                'enabled' => (bool) ($tf['enabled'] ?? false),
                'api_key' => (string) ($tf['api_key'] ?? ''),
            ],
        ];
    }

    /**
     * @param  VerificationShape  $cfg
     * @return array{twilio_lookup: array{enabled: bool, account_sid: string, auth_token_set: bool}, email_verification: array{enabled: bool}, trustedform: array{enabled: bool, api_key_set: bool}}
     */
    public static function forClient(array $cfg): array
    {
        return [
            'twilio_lookup' => [
                'enabled' => $cfg['twilio_lookup']['enabled'],
                'account_sid' => $cfg['twilio_lookup']['account_sid'],
                'auth_token_set' => $cfg['twilio_lookup']['auth_token'] !== '',
            ],
            'email_verification' => [
                'enabled' => $cfg['email_verification']['enabled'],
            ],
            'trustedform' => [
                'enabled' => $cfg['trustedform']['enabled'],
                'api_key_set' => $cfg['trustedform']['api_key'] !== '',
            ],
        ];
    }
}
