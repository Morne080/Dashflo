<?php

namespace App\Services;

use App\Models\IntegrationSource;
use App\Support\WebhookEditorConfig;

/**
 * After a file import, align webhook editor field_rows + sample_payload with discovered payload keys
 * so Integrations → webhook UI matches the file without manual setup.
 */
final class LeadImportWebhookSettingsSync
{
    /**
     * @param  list<string>  $discoveredKeys
     * @param  array<string, mixed>|null  $firstRow
     */
    public function sync(IntegrationSource $source, array $discoveredKeys, ?array $firstRow): void
    {
        if ($source->kind !== IntegrationSource::KIND_WEBHOOK) {
            return;
        }

        $discoveredKeys = array_values(array_unique(array_filter(array_map(
            static fn ($k) => trim((string) $k),
            $discoveredKeys,
        ), static fn ($k) => $k !== '')));

        if ($discoveredKeys === []) {
            return;
        }

        sort($discoveredKeys);

        $source->refresh();
        $settings = is_array($source->settings) ? $source->settings : [];
        $webhook = is_array($settings['webhook'] ?? null) ? $settings['webhook'] : [];

        $rawRows = $webhook['field_rows'] ?? null;
        $existingRows = [];
        if (is_array($rawRows)) {
            foreach ($rawRows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $existingRows[] = [
                    'label' => (string) ($row['label'] ?? ''),
                    'incoming_key' => trim((string) ($row['incoming_key'] ?? '')),
                    'static_value' => (string) ($row['static_value'] ?? ''),
                ];
            }
        }

        $hasConfiguredRows = false;
        if ($existingRows !== []) {
            foreach ($existingRows as $r) {
                if (($r['incoming_key'] ?? '') !== '') {
                    $hasConfiguredRows = true;
                    break;
                }
            }
        }

        $fieldRows = $hasConfiguredRows
            ? WebhookEditorConfig::mergeIncomingKeysIntoFieldRows($existingRows, $discoveredKeys)
            : WebhookEditorConfig::fieldRowsFromIncomingKeys($discoveredKeys);

        $webhook['field_rows'] = $fieldRows;
        $webhook['sample_payload'] = WebhookEditorConfig::samplePayloadJsonFromImport($discoveredKeys, $firstRow);
        $webhook['payload_type'] = (string) ($webhook['payload_type'] ?? 'json');

        $settings['webhook'] = $webhook;
        $source->update(['settings' => $settings]);
    }
}
