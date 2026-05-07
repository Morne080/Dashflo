<?php

namespace App\Leads;

use App\Models\IntegrationFact;

/**
 * Splits stored dimensions/measures into "standard" vs "custom" rows for the lead detail UI.
 *
 * @phpstan-type EditRef array{bag: 'dimensions'|'measures', key: string}
 */
final class LeadDetailPresenter
{
    /**
     * @return list<array{label: string, value: string, edit: EditRef|null}>
     */
    public static function standardFieldRows(IntegrationFact $fact): array
    {
        return self::standardRowsAndUsed($fact)['rows'];
    }

    /**
     * @return list<array{key: string, storage_key: string, bag: 'dimensions'|'measures', value: string}>
     */
    public static function customFieldRows(IntegrationFact $fact): array
    {
        $used = self::standardRowsAndUsed($fact)['used_norm_keys'];
        $m = self::mergedByNormKeyWithBag($fact);

        $rows = [];
        foreach ($m as $norm => $cell) {
            if (isset($used[$norm])) {
                continue;
            }
            $text = self::formatScalar($cell['value']);
            if ($text === '' || $text === '—') {
                continue;
            }
            $rows[] = [
                'key' => self::humanizeKey((string) $cell['display']),
                'storage_key' => (string) $cell['display'],
                'bag' => $cell['bag'],
                'value' => $text,
            ];
        }

        usort($rows, fn ($a, $b) => strcasecmp($a['key'], $b['key']));

        return $rows;
    }

    /**
     * @return array{rows: list<array{label: string, value: string, edit: EditRef|null}>, used_norm_keys: array<string, true>}
     */
    private static function standardRowsAndUsed(IntegrationFact $fact): array
    {
        $m = self::mergedByNormKeyWithBag($fact);
        $used = [];

        $pick = static function (array $keys) use ($m, &$used): ?array {
            foreach ($keys as $k) {
                $nk = strtolower($k);
                if (isset($used[$nk]) || ! isset($m[$nk])) {
                    continue;
                }
                $text = self::formatScalar($m[$nk]['value']);
                if ($text === '' || $text === '—') {
                    continue;
                }

                return [
                    'norm' => $nk,
                    'text' => $text,
                    'bag' => $m[$nk]['bag'],
                    'storage_key' => (string) $m[$nk]['display'],
                ];
            }

            return null;
        };

        $consume = static function (array $norms) use (&$used): void {
            foreach ($norms as $n) {
                $used[$n] = true;
            }
        };

        $rows = [];

        if ($p = $pick(['full_name', 'name', 'contact_name'])) {
            $rows[] = [
                'label' => 'Contact name',
                'value' => $p['text'],
                'edit' => ['bag' => $p['bag'], 'key' => $p['storage_key']],
            ];
            $consume([$p['norm']]);
        } else {
            $fn = $pick(['firstname', 'first_name']);
            $ln = $pick(['lastname', 'last_name']);
            $combined = trim(($fn['text'] ?? '').' '.($ln['text'] ?? ''));
            if ($combined !== '') {
                $rows[] = [
                    'label' => 'Contact name',
                    'value' => $combined,
                    'edit' => null,
                ];
                if ($fn) {
                    $consume([$fn['norm']]);
                }
                if ($ln) {
                    $consume([$ln['norm']]);
                }
            }
        }

        $event = $fact->relationLoaded('ingestionEvent') ? $fact->ingestionEvent : null;
        $received = $event?->created_at ?? $fact->created_at;
        $rows[] = [
            'label' => 'Date & time received',
            'value' => $received !== null ? $received->format('d/m/Y H:i:s') : '—',
            'edit' => null,
        ];

        $slots = [
            ['Campaign', ['campaign', 'campid']],
            ['Supplier', ['supplier', 'supplier_name', 'sid', 'supplier_sid']],
            ['Email', ['email']],
            ['First name', ['firstname', 'first_name']],
            ['Full name', ['full_name', 'name']],
            ['Last name', ['lastname', 'last_name']],
            ['Street 1', ['street1', 'street_1', 'address', 'address1']],
            ['Street 2', ['street2', 'street_2', 'address2']],
            ['Town / city', ['town', 'city', 'geo_city']],
            ['County', ['county', 'geo_county', 'accident_state', 'state_code']],
            ['Postcode', ['postcode', 'zip', 'geo_zip']],
            ['Phone 1', ['phone1', 'phone', 'phone_1', 'phonenumber']],
            ['Fax', ['fax']],
            ['IP address', ['ipaddress', 'ip_address', 'ip']],
            ['Source', ['source', 'platform', 'ssid']],
            ['Country', ['country']],
            ['C1', ['c1']],
            ['C2', ['c2']],
            ['C3', ['c3']],
            ['Optin URL', ['optinurl', 'optin_url', 'optin']],
        ];

        foreach ($slots as [$label, $keys]) {
            if ($p = $pick($keys)) {
                $rows[] = [
                    'label' => $label,
                    'value' => $p['text'],
                    'edit' => ['bag' => $p['bag'], 'key' => $p['storage_key']],
                ];
                $consume([$p['norm']]);
            }
        }

        return ['rows' => $rows, 'used_norm_keys' => $used];
    }

    /**
     * @return array<string, array{display: string, value: mixed, bag: 'dimensions'|'measures'}>
     */
    private static function mergedByNormKeyWithBag(IntegrationFact $fact): array
    {
        $out = [];
        foreach (($fact->dimensions ?? []) as $k => $v) {
            if (! is_string($k)) {
                continue;
            }
            $norm = strtolower($k);
            $out[$norm] = ['display' => $k, 'value' => $v, 'bag' => 'dimensions'];
        }
        foreach (($fact->measures ?? []) as $k => $v) {
            if (! is_string($k)) {
                continue;
            }
            $norm = strtolower($k);
            if (! isset($out[$norm])) {
                $out[$norm] = ['display' => $k, 'value' => $v, 'bag' => 'measures'];
            }
        }

        return $out;
    }

    private static function humanizeKey(string $key): string
    {
        $key = str_replace(['_', '-'], ' ', $key);

        return ucwords(strtolower($key));
    }

    private static function formatScalar(mixed $value): string
    {
        if ($value === null) {
            return '—';
        }
        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }
        if (is_string($value)) {
            return trim($value) === '' ? '—' : $value;
        }
        if (is_array($value)) {
            $json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            return $json !== false ? $json : '—';
        }

        return '—';
    }
}
