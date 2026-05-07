<?php

namespace App\Support;

use App\Models\IntegrationFact;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Dashboard “Add filter”: equality on {@see \App\Models\Lead} columns and/or JSON dimensions on {@see IntegrationFact}.
 */
final class LeadCustomFilters
{
    /**
     * Whitelisted `leads` column name => human label for the UI.
     *
     * @return array<string, string>
     */
    public static function fieldLabels(): array
    {
        return [
            'source' => 'Traffic source',
            'utm_source' => 'UTM source',
            'lead_type' => 'Lead type',
            'disposition' => 'Disposition',
            'injury_type' => 'Injury type',
            'treatment_time' => 'Treatment time',
            'phone_verification' => 'Phone verification',
            'external_id' => 'External ID',
        ];
    }

    /**
     * @return list<string>
     */
    public static function allowedLeadColumns(): array
    {
        return array_keys(self::fieldLabels());
    }

    /**
     * Dimension keys observed on recent integration facts for this user (all sources).
     *
     * @return list<string>
     */
    public static function discoverFactDimensionKeysForUser(User $user): array
    {
        $facts = IntegrationFact::query()
            ->whereHas('integrationSource', fn ($q) => $q->where('user_id', $user->id))
            ->orderByDesc('id')
            ->limit(500)
            ->get(['dimensions']);

        $keys = [];
        foreach ($facts as $f) {
            if (! is_array($f->dimensions)) {
                continue;
            }
            foreach (array_keys($f->dimensions) as $k) {
                $keys[(string) $k] = true;
            }
        }

        $out = array_keys($keys);
        sort($out);

        return $out;
    }

    /**
     * Rows for the filter UI: lead columns plus discovered fact dimensions (deduped by key; lead wins).
     *
     * @return list<array{key: string, label: string, scope: string}>
     */
    public static function customFilterFieldsCatalog(?User $user): array
    {
        $rows = [];
        foreach (self::fieldLabels() as $key => $label) {
            $rows[] = ['key' => $key, 'label' => $label, 'scope' => 'lead'];
        }

        $leadKeys = array_flip(self::allowedLeadColumns());

        if ($user !== null) {
            foreach (self::discoverFactDimensionKeysForUser($user) as $key) {
                if (isset($leadKeys[$key])) {
                    continue;
                }
                $rows[] = [
                    'key' => $key,
                    'label' => Str::headline(str_replace('_', ' ', $key)),
                    'scope' => 'fact',
                ];
            }
        }

        usort($rows, function ($a, $b) {
            if ($a['scope'] !== $b['scope']) {
                return $a['scope'] === 'lead' ? -1 : 1;
            }

            return strcmp($a['label'], $b['label']);
        });

        return $rows;
    }

    /**
     * Distinct values per field for “Add filter” value picklists (lead columns + integration dimensions).
     *
     * @return array<string, list<string>>
     */
    public static function customFilterFieldOptionsMap(User $user): array
    {
        $out = [];

        foreach (self::allowedLeadColumns() as $col) {
            $out[$col] = self::distinctLeadColumnValues($col);
        }

        $leadFlip = array_flip(self::allowedLeadColumns());
        foreach (self::discoverFactDimensionKeysForUser($user) as $key) {
            if (isset($leadFlip[$key])) {
                continue;
            }
            $out[$key] = self::distinctFactDimensionValuesForUser($user, $key);
        }

        return $out;
    }

    public static function isAllowedLeadColumn(string $column): bool
    {
        return isset(array_flip(self::allowedLeadColumns())[$column]);
    }

    /**
     * Distinct values for a whitelisted `leads` column, optionally scoped to rows with a given traffic {@see Lead::$source}.
     *
     * @return list<string>
     */
    public static function distinctLeadColumnValuesScoped(?string $trafficSource, string $column): array
    {
        if (! self::isAllowedLeadColumn($column)) {
            return [];
        }

        $q = DB::table('leads')->whereNotNull($column);

        if ($trafficSource !== null && $trafficSource !== '') {
            $q->where('source', $trafficSource);
        }

        $values = $q->distinct()->orderBy($column)->limit(500)->pluck($column);

        return self::normalizeDistinctValues($values->all());
    }

    /**
     * @return list<string>
     */
    private static function distinctLeadColumnValues(string $column): array
    {
        return self::distinctLeadColumnValuesScoped(null, $column);
    }

    /**
     * Whether this field can be used with {@see self::distinctLeadColumnValuesScoped()} or fact dimension helpers.
     */
    public static function isKnownCatalogFieldForUser(User $user, string $column): bool
    {
        if (self::isAllowedLeadColumn($column)) {
            return true;
        }

        return isset(array_flip(self::discoverFactDimensionKeysForUser($user))[$column]);
    }

    /**
     * Distinct JSON dimension values for the user's integration facts, optionally restricted to leads with a traffic source.
     *
     * @return list<string>
     */
    public static function distinctFactDimensionValuesScopedForUser(User $user, string $field, ?string $trafficSource): array
    {
        if (! self::isSafeFactFieldKey($field)) {
            return [];
        }

        $discovered = array_flip(self::discoverFactDimensionKeysForUser($user));
        if (! isset($discovered[$field])) {
            return [];
        }

        $driver = DB::connection()->getDriverName();

        $q = DB::table('integration_facts')
            ->join('integration_sources', 'integration_sources.id', '=', 'integration_facts.integration_source_id')
            ->where('integration_sources.user_id', $user->id);

        if ($trafficSource !== null && $trafficSource !== '') {
            $q->join('leads', 'leads.external_id', '=', 'integration_facts.external_id')
                ->where('leads.source', $trafficSource);
        }

        if ($driver === 'sqlite') {
            $q->selectRaw('json_extract(integration_facts.dimensions, \'$.\' || ?) as dim_val', [$field])
                ->whereRaw('json_extract(integration_facts.dimensions, \'$.\' || ?) IS NOT NULL', [$field])
                ->distinct()
                ->orderBy('dim_val')
                ->limit(500);
        } else {
            $q->selectRaw(
                'JSON_UNQUOTE(JSON_EXTRACT(integration_facts.dimensions, CONCAT(\'$.\', JSON_QUOTE(?)))) as dim_val',
                [$field],
            )
                ->whereRaw(
                    'JSON_EXTRACT(integration_facts.dimensions, CONCAT(\'$.\', JSON_QUOTE(?))) IS NOT NULL',
                    [$field],
                )
                ->distinct()
                ->orderBy('dim_val')
                ->limit(500);
        }

        return self::normalizeDistinctValues($q->pluck('dim_val')->all());
    }

    /**
     * @return list<string>
     */
    private static function distinctFactDimensionValuesForUser(User $user, string $field): array
    {
        return self::distinctFactDimensionValuesScopedForUser($user, $field, null);
    }

    /**
     * @param  list<mixed>  $raw
     * @return list<string>
     */
    private static function normalizeDistinctValues(array $raw): array
    {
        return collect($raw)
            ->map(fn ($v) => trim((string) $v))
            ->filter(fn ($v) => $v !== '')
            ->unique()
            ->sort()
            ->values()
            ->take(500)
            ->all();
    }

    /**
     * @param  mixed  $raw  JSON string or array from query / Inertia
     * @return list<array{field: string, value: string, scope: string}>
     */
    public static function normalize(mixed $raw, ?User $userForDiscovery = null, ?int $filterUserId = null): array
    {
        if ($raw === null || $raw === '' || $raw === []) {
            return [];
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (! is_array($decoded)) {
                return [];
            }
            $raw = $decoded;
        }

        if (! is_array($raw)) {
            return [];
        }

        $leadAllowed = array_flip(self::allowedLeadColumns());
        $factDiscovery = $userForDiscovery !== null
            ? array_flip(self::discoverFactDimensionKeysForUser($userForDiscovery))
            : null;

        $out = [];

        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $field = isset($row['field']) ? trim((string) $row['field']) : '';
            $value = isset($row['value']) ? trim((string) $row['value']) : '';
            $explicitScope = isset($row['scope']) ? (string) $row['scope'] : '';

            if ($field === '' || $value === '') {
                continue;
            }

            if (strlen($value) > 500) {
                $value = substr($value, 0, 500);
            }

            $scope = self::resolveScope($field, $explicitScope, $leadAllowed, $factDiscovery);
            if ($scope === null) {
                continue;
            }

            if ($scope === 'fact' && $filterUserId === null) {
                continue;
            }

            $out[] = ['field' => $field, 'value' => $value, 'scope' => $scope];
            if (count($out) >= 10) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, true>  $leadAllowed
     * @param  array<string, true>|null  $factDiscovery
     */
    private static function resolveScope(string $field, string $explicitScope, array $leadAllowed, ?array $factDiscovery): ?string
    {
        if (isset($leadAllowed[$field])) {
            return 'lead';
        }

        if ($factDiscovery !== null && isset($factDiscovery[$field])) {
            return 'fact';
        }

        if ($explicitScope === 'fact' && self::isSafeFactFieldKey($field)) {
            return 'fact';
        }

        return null;
    }

    public static function isSafeFactFieldKey(string $field): bool
    {
        return (bool) preg_match('/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/', $field);
    }
}
