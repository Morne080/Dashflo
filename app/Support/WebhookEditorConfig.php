<?php

namespace App\Support;

/**
 * Normalizes inbound webhook editor JSON stored on integration_sources.settings.webhook.
 *
 * @phpstan-type WebhookEditor array{
 *     category: string,
 *     description: string,
 *     webhook_version: string,
 *     payload_type: string,
 *     capture_method: string,
 *     sample_payload: string,
 *     encryption_type: string,
 *     output_timezone: string,
 *     field_rows: list<array{label: string, incoming_key: string, static_value: string}>,
 *     response_mode: 'json'|'plain',
 *     response_plain_body: string,
 *     custom_headers_enabled: bool,
 * }
 */
final class WebhookEditorConfig
{
    /**
     * @return list<array{label: string, incoming_key: string, static_value: string}>
     */
    public static function defaultFieldRows(): array
    {
        return [
            ['label' => 'EMAIL', 'incoming_key' => 'email', 'static_value' => ''],
            ['label' => 'PHONE1', 'incoming_key' => 'phone1', 'static_value' => ''],
            ['label' => 'TRUSTEDFORM_URL', 'incoming_key' => 'trustedform_url', 'static_value' => ''],
            ['label' => 'FIRSTNAME', 'incoming_key' => 'firstname', 'static_value' => ''],
            ['label' => 'LASTNAME', 'incoming_key' => 'lastname', 'static_value' => ''],
            ['label' => 'CITY', 'incoming_key' => 'city', 'static_value' => ''],
            ['label' => 'STATE', 'incoming_key' => 'state', 'static_value' => ''],
            ['label' => 'ZIP', 'incoming_key' => 'zip', 'static_value' => ''],
        ];
    }

    public static function defaultSamplePayload(): string
    {
        $sample = [
            'email' => '{email}',
            'phone' => '{phone1}',
            'trustedform_cert_url' => '{trustedform_url}',
            'first_name' => '{firstname}',
            'last_name' => '{lastname}',
            'city' => '{city}',
            'state' => '{state}',
            'zip_code' => '{zip}',
        ];

        return (string) json_encode($sample, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * @param  array<string, mixed>|null  $root
     * @return WebhookEditor
     */
    public static function fromSettingsRoot(?array $root): array
    {
        $w = is_array($root) ? $root : [];
        $rows = $w['field_rows'] ?? null;
        $fieldRows = [];
        if (is_array($rows)) {
            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $fieldRows[] = [
                    'label' => (string) ($row['label'] ?? ''),
                    'incoming_key' => (string) ($row['incoming_key'] ?? ''),
                    'static_value' => (string) ($row['static_value'] ?? ''),
                ];
            }
        }
        if ($fieldRows === []) {
            $fieldRows = self::defaultFieldRows();
        }

        $mode = (string) ($w['response_mode'] ?? 'json');

        return [
            'category' => (string) ($w['category'] ?? 'lead_capture'),
            'description' => (string) ($w['description'] ?? ''),
            'webhook_version' => (string) ($w['webhook_version'] ?? '1.0'),
            'payload_type' => (string) ($w['payload_type'] ?? 'json'),
            'capture_method' => (string) ($w['capture_method'] ?? ''),
            'sample_payload' => (string) ($w['sample_payload'] ?? '') !== '' ? (string) $w['sample_payload'] : self::defaultSamplePayload(),
            'encryption_type' => (string) ($w['encryption_type'] ?? ''),
            'output_timezone' => (string) ($w['output_timezone'] ?? ''),
            'field_rows' => $fieldRows,
            'response_mode' => $mode === 'plain' ? 'plain' : 'json',
            'response_plain_body' => (string) ($w['response_plain_body'] ?? 'ACCEPTED'),
            'custom_headers_enabled' => (bool) ($w['custom_headers_enabled'] ?? false),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return WebhookEditor
     */
    /**
     * Build field rows from payload keys (used after lead import to match file columns).
     *
     * @param  list<string>  $incomingKeys  Unique keys (e.g. CSV headers or JSON object keys)
     * @return list<array{label: string, incoming_key: string, static_value: string}>
     */
    public static function fieldRowsFromIncomingKeys(array $incomingKeys): array
    {
        $rows = [];
        foreach ($incomingKeys as $key) {
            $key = trim((string) $key);
            if ($key === '') {
                continue;
            }
            $label = strtoupper(str_replace('_', ' ', $key));
            if (strlen($label) > 80) {
                $label = substr($label, 0, 80);
            }
            $rows[] = [
                'label' => $label,
                'incoming_key' => $key,
                'static_value' => '',
            ];
        }

        return $rows;
    }

    /**
     * Append any discovered keys not already mapped in field_rows.
     *
     * @param  list<array{label: string, incoming_key: string, static_value: string}>  $existingRows
     * @param  list<string>  $discoveredKeys
     * @return list<array{label: string, incoming_key: string, static_value: string}>
     */
    public static function mergeIncomingKeysIntoFieldRows(array $existingRows, array $discoveredKeys): array
    {
        $known = [];
        $out = [];
        foreach ($existingRows as $row) {
            $k = trim((string) ($row['incoming_key'] ?? ''));
            if ($k !== '') {
                $known[$k] = true;
            }
            $out[] = [
                'label' => (string) ($row['label'] ?? ''),
                'incoming_key' => $k,
                'static_value' => (string) ($row['static_value'] ?? ''),
            ];
        }

        foreach ($discoveredKeys as $key) {
            $key = trim((string) $key);
            if ($key === '' || isset($known[$key])) {
                continue;
            }
            $label = strtoupper(str_replace('_', ' ', $key));
            if (strlen($label) > 80) {
                $label = substr($label, 0, 80);
            }
            $out[] = [
                'label' => $label,
                'incoming_key' => $key,
                'static_value' => '',
            ];
            $known[$key] = true;
        }

        return $out;
    }

    /**
     * Strip sensitive values while keeping shape for sample_payload JSON.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public static function scrubRowForSamplePayload(array $row): array
    {
        $out = [];
        foreach ($row as $k => $v) {
            if (! is_string($k)) {
                continue;
            }
            if (is_bool($v)) {
                $out[$k] = false;
            } elseif (is_int($v) || is_float($v)) {
                $out[$k] = 0;
            } else {
                $out[$k] = '';
            }
        }

        return $out;
    }

    /**
     * @param  list<string>  $discoveredKeys
     * @param  array<string, mixed>|null  $firstRow
     */
    public static function samplePayloadJsonFromImport(array $discoveredKeys, ?array $firstRow): string
    {
        $template = [];
        foreach ($discoveredKeys as $k) {
            $template[$k] = '';
        }
        if ($firstRow !== null && $firstRow !== []) {
            $scrubbed = self::scrubRowForSamplePayload($firstRow);
            foreach ($discoveredKeys as $k) {
                if (array_key_exists($k, $scrubbed)) {
                    $template[$k] = $scrubbed[$k];
                }
            }
        }

        return (string) json_encode($template, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    public static function normalizeFromRequest(array $input): array
    {
        $rowsIn = $input['field_rows'] ?? null;
        $fieldRows = [];
        if (is_array($rowsIn)) {
            foreach ($rowsIn as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $fieldRows[] = [
                    'label' => (string) ($row['label'] ?? ''),
                    'incoming_key' => (string) ($row['incoming_key'] ?? ''),
                    'static_value' => (string) ($row['static_value'] ?? ''),
                ];
            }
        }
        if ($fieldRows === []) {
            $fieldRows = self::defaultFieldRows();
        }

        $mode = (string) ($input['response_mode'] ?? 'json');

        return [
            'category' => (string) ($input['category'] ?? 'lead_capture'),
            'description' => (string) ($input['description'] ?? ''),
            'webhook_version' => (string) ($input['webhook_version'] ?? '1.0'),
            'payload_type' => (string) ($input['payload_type'] ?? 'json'),
            'capture_method' => (string) ($input['capture_method'] ?? ''),
            'sample_payload' => (string) ($input['sample_payload'] ?? '') !== '' ? (string) $input['sample_payload'] : self::defaultSamplePayload(),
            'encryption_type' => (string) ($input['encryption_type'] ?? ''),
            'output_timezone' => (string) ($input['output_timezone'] ?? ''),
            'field_rows' => $fieldRows,
            'response_mode' => $mode === 'plain' ? 'plain' : 'json',
            'response_plain_body' => (string) ($input['response_plain_body'] ?? 'ACCEPTED'),
            'custom_headers_enabled' => (bool) ($input['custom_headers_enabled'] ?? false),
        ];
    }
}
