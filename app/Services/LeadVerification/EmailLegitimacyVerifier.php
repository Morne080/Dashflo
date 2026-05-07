<?php

namespace App\Services\LeadVerification;

/**
 * Lightweight legitimacy checks (no paid third-party required).
 */
final class EmailLegitimacyVerifier
{
    /**
     * @return array{ok: bool, syntax_ok: bool, mx_ok: bool|null, error: string|null}
     */
    public function verify(string $email): array
    {
        $email = trim(strtolower($email));
        if ($email === '') {
            return [
                'ok' => false,
                'syntax_ok' => false,
                'mx_ok' => null,
                'error' => 'Empty email.',
            ];
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [
                'ok' => false,
                'syntax_ok' => false,
                'mx_ok' => null,
                'error' => 'Invalid email format.',
            ];
        }

        $domain = substr(strrchr($email, '@') ?: '', 1);
        if ($domain === '') {
            return [
                'ok' => false,
                'syntax_ok' => true,
                'mx_ok' => null,
                'error' => 'Missing domain.',
            ];
        }

        $mxOk = @checkdnsrr($domain, 'MX') || @checkdnsrr($domain, 'A');

        return [
            'ok' => (bool) $mxOk,
            'syntax_ok' => true,
            'mx_ok' => $mxOk,
            'error' => $mxOk ? null : 'Domain has no MX or A record.',
        ];
    }
}
