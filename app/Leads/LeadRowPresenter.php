<?php

namespace App\Leads;

use App\Models\IntegrationFact;

final class LeadRowPresenter
{
    /**
     * @return array{
     *     id: int,
     *     external_id: string|null,
     *     received_at: string|null,
     *     created_at: string|null,
     *     record_summary: string|null,
     *     campaign: string|null,
     *     supplier: string|null,
     *     platform: string|null,
     *     source_id: int,
     *     source_name: string|null,
     *     ingestion_event_id: int|null,
     *     delivery_status: string|null,
     * }
     */
    public static function fromFact(IntegrationFact $f): array
    {
        $dims = is_array($f->dimensions) ? $f->dimensions : [];
        $meas = is_array($f->measures) ? $f->measures : [];

        $event = $f->relationLoaded('ingestionEvent') ? $f->ingestionEvent : null;
        $source = $f->relationLoaded('integrationSource') ? $f->integrationSource : null;

        $receivedAt = $event?->created_at?->toIso8601String()
            ?? $f->created_at?->toIso8601String();

        return [
            'id' => $f->id,
            'external_id' => $f->external_id,
            'received_at' => $receivedAt,
            'created_at' => $f->created_at?->toIso8601String(),
            'record_summary' => self::recordSummary($dims, $meas),
            'campaign' => self::dimCi($dims, 'campaign') ?? self::dimCi($dims, 'campid')
                ?? self::measCi($meas, 'campaign') ?? self::measCi($meas, 'campid'),
            'supplier' => self::dimCi($dims, 'supplier') ?? self::dimCi($dims, 'supplier_name'),
            'platform' => self::dimCi($dims, 'source')
                ?? self::dimCi($dims, 'platform')
                ?? self::dimCi($dims, 'ssid'),
            'source_id' => $f->integration_source_id,
            'source_name' => $source?->name,
            'ingestion_event_id' => $f->ingestion_event_id,
            'delivery_status' => $event?->status,
        ];
    }

    /**
     * @param  array<string, mixed>  $dims
     * @param  array<string, mixed>  $meas
     */
    private static function recordSummary(array $dims, array $meas): ?string
    {
        foreach (['full_name', 'name', 'lead_name', 'record_summary', 'title', 'email'] as $k) {
            $v = self::dimCi($dims, $k) ?? self::measCi($meas, $k);
            if ($v !== null) {
                return $v;
            }
        }

        $fn = self::dimCi($dims, 'firstname') ?? self::dimCi($dims, 'first_name') ?? '';
        $ln = self::dimCi($dims, 'lastname') ?? self::dimCi($dims, 'last_name') ?? '';
        $full = trim($fn.' '.$ln);

        return $full !== '' ? $full : null;
    }

    /**
     * @param  array<string, mixed>  $dims
     */
    private static function dimCi(array $dims, string $key): ?string
    {
        foreach ($dims as $k => $v) {
            if (is_string($k) && strcasecmp($k, $key) === 0) {
                return self::scalarToDisplayString($v);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $meas
     */
    private static function measCi(array $meas, string $key): ?string
    {
        foreach ($meas as $k => $v) {
            if (is_string($k) && strcasecmp($k, $key) === 0) {
                return self::scalarToDisplayString($v);
            }
        }

        return null;
    }

    private static function scalarToDisplayString(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        if (is_string($v)) {
            return $v === '' ? null : $v;
        }
        if (is_int($v) || is_float($v)) {
            return (string) $v;
        }
        if (is_bool($v)) {
            return $v ? 'true' : 'false';
        }

        return null;
    }
}
