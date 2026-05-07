<?php

namespace App\Services\LeadVerification;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;

/**
 * Pulls common contact fields from stored fact dimensions/measures.
 */
final class LeadPayloadExtractor
{
    /** @var list<string> */
    private const PHONE_KEYS = [
        'phone1', 'phone', 'phone_1', 'phonenumber', 'mobile', 'tel', 'phone_number',
    ];

    /** @var list<string> */
    private const EMAIL_KEYS = [
        'email', 'email_address', 'e_mail',
    ];

    /** @var list<string> */
    private const TRUSTEDFORM_URL_KEYS = [
        'trustedform_url', 'xxtrustedformcerturl', 'trusted_form_cert_url',
        'trustedform_cert_url', 'trustedformcerturl',
    ];

    public static function firstPhone(IntegrationFact $fact, ?IntegrationSource $source = null): ?string
    {
        $flat = self::flatStringMap($fact);
        $chain = self::phoneKeyChain($source);
        foreach ($chain as $k) {
            $norm = strtolower($k);
            if (isset($flat[$norm]) && trim($flat[$norm]) !== '') {
                return $flat[$norm];
            }
        }

        return null;
    }

    public static function firstEmail(IntegrationFact $fact, ?IntegrationSource $source = null): ?string
    {
        $flat = self::flatStringMap($fact);
        $chain = self::emailKeyChain($source);
        foreach ($chain as $k) {
            $norm = strtolower($k);
            if (isset($flat[$norm]) && trim($flat[$norm]) !== '') {
                return $flat[$norm];
            }
        }

        return null;
    }

    public static function firstTrustedFormCertificateUrl(IntegrationFact $fact, ?IntegrationSource $source = null): ?string
    {
        $flat = self::flatStringMap($fact);
        $chain = self::trustedFormKeyChain($source);
        foreach ($chain as $k) {
            $norm = strtolower($k);
            if (isset($flat[$norm])) {
                $val = $flat[$norm];
                if ($val !== '' && str_contains(strtolower($val), 'trustedform')) {
                    return $val;
                }
            }
        }

        foreach ($flat as $val) {
            if (str_starts_with(strtolower($val), 'https://cert.trustedform.com/')) {
                return $val;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private static function phoneKeyChain(?IntegrationSource $source): array
    {
        $preferred = [];
        if ($source instanceof IntegrationSource && $source->kind === IntegrationSource::KIND_WEBHOOK) {
            foreach (['PHONE1', 'PHONE'] as $lab) {
                foreach ($source->webhookIncomingKeysForLabel($lab) as $k) {
                    $preferred[] = $k;
                }
            }
        }
        $seen = [];
        $out = [];
        foreach (array_merge($preferred, self::PHONE_KEYS) as $k) {
            $n = strtolower($k);
            if (isset($seen[$n])) {
                continue;
            }
            $seen[$n] = true;
            $out[] = $k;
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private static function emailKeyChain(?IntegrationSource $source): array
    {
        $preferred = [];
        if ($source instanceof IntegrationSource && $source->kind === IntegrationSource::KIND_WEBHOOK) {
            foreach ($source->webhookIncomingKeysForLabel('EMAIL') as $k) {
                $preferred[] = $k;
            }
        }
        $seen = [];
        $out = [];
        foreach (array_merge($preferred, self::EMAIL_KEYS) as $k) {
            $n = strtolower($k);
            if (isset($seen[$n])) {
                continue;
            }
            $seen[$n] = true;
            $out[] = $k;
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private static function trustedFormKeyChain(?IntegrationSource $source): array
    {
        $preferred = [];
        if ($source instanceof IntegrationSource && $source->kind === IntegrationSource::KIND_WEBHOOK) {
            foreach (['TRUSTEDFORM_URL', 'TRUSTEDFORM', 'TRUSTEDFORMCERTURL'] as $lab) {
                foreach ($source->webhookIncomingKeysForLabel($lab) as $k) {
                    $preferred[] = $k;
                }
            }
        }
        $seen = [];
        $out = [];
        foreach (array_merge($preferred, self::TRUSTEDFORM_URL_KEYS) as $k) {
            $n = strtolower($k);
            if (isset($seen[$n])) {
                continue;
            }
            $seen[$n] = true;
            $out[] = $k;
        }

        return $out;
    }

    /**
     * Best-effort E.164 for US 10-digit numbers; otherwise returns trimmed digits with + prefix when possible.
     */
    public static function normalizePhoneForLookup(string $raw): ?string
    {
        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '') {
            return null;
        }
        if (strlen($digits) === 10) {
            return '+1'.$digits;
        }
        if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
            return '+'.$digits;
        }
        if (str_starts_with($raw, '+') && strlen($digits) >= 10) {
            return '+'.$digits;
        }

        return strlen($digits) >= 10 ? '+'.$digits : null;
    }

    /**
     * @return array<string, string> lower_key => string value (scalar only)
     */
    private static function flatStringMap(IntegrationFact $fact): array
    {
        $out = [];
        foreach ([$fact->dimensions ?? [], $fact->measures ?? []] as $bag) {
            if (! is_array($bag)) {
                continue;
            }
            foreach ($bag as $k => $v) {
                if (! is_string($k)) {
                    continue;
                }
                if (is_string($v)) {
                    $t = trim($v);
                    if ($t !== '') {
                        $out[strtolower($k)] = $t;
                    }
                } elseif (is_int($v) || is_float($v)) {
                    $out[strtolower($k)] = (string) $v;
                }
            }
        }

        return $out;
    }
}
