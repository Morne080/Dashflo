<?php

namespace App\Services;

use App\Models\IntegrationFact;
use Carbon\CarbonImmutable;

/**
 * Turns arbitrary JSON webhook/API payloads into rows suitable for {@see IntegrationFact}.
 *
 * @return list<array{external_id: ?string, occurred_at: ?CarbonImmutable, dimensions: array<string, mixed>, measures: array<string, mixed>}>
 */
final class IntegrationJsonFactParser
{
    /**
     * @return list<array<string, mixed>>
     */
    public function recordsFromJson(mixed $decoded): array
    {
        if ($decoded === null) {
            return [];
        }

        if (is_array($decoded) && array_is_list($decoded)) {
            return $decoded;
        }

        if (is_array($decoded)) {
            foreach (['records', 'data', 'events', 'items', 'results'] as $key) {
                if (isset($decoded[$key]) && is_array($decoded[$key]) && array_is_list($decoded[$key])) {
                    return $decoded[$key];
                }
            }

            return [$decoded];
        }

        return [['value' => $decoded]];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{external_id: ?string, occurred_at: ?CarbonImmutable, dimensions: array<string, mixed>, measures: array<string, mixed>}
     */
    public function normalizeRow(array $row): array
    {
        $externalId = null;
        foreach (['external_id', 'id', 'uuid', 'lead_id'] as $k) {
            if (isset($row[$k]) && (is_string($row[$k]) || is_int($row[$k]) || is_float($row[$k]))) {
                $externalId = (string) $row[$k];
                break;
            }
        }

        $occurredAt = null;
        foreach (['occurred_at', 'timestamp', 'created_at', 'date'] as $k) {
            if (! isset($row[$k])) {
                continue;
            }
            $v = $row[$k];
            if (is_string($v)) {
                try {
                    $occurredAt = CarbonImmutable::parse($v);
                } catch (\Throwable) {
                    $occurredAt = null;
                }
                break;
            }
        }

        $dimensions = [];
        $measures = [];
        foreach ($row as $key => $value) {
            if (! is_string($key)) {
                continue;
            }
            if ($this->isMeasureValue($value)) {
                $measures[$key] = $value;
            } else {
                $dimensions[$key] = $value;
            }
        }

        if ($measures === [] && $dimensions !== []) {
            $measures = $row;
            $dimensions = [];
        }

        return [
            'external_id' => $externalId,
            'occurred_at' => $occurredAt,
            'dimensions' => $dimensions,
            'measures' => $measures,
        ];
    }

    private function isMeasureValue(mixed $value): bool
    {
        return is_int($value)
            || is_float($value)
            || (is_string($value) && is_numeric($value));
    }
}
