<?php

namespace App\Support;

use App\Models\Dashboard;

/**
 * Persisted dashboard toolbar filters ({@see Dashboard::$filters_json}) ↔ URL query (matches frontend {@see filtersToQueryRecord}).
 */
final class DashboardSavedFilters
{
    /**
     * Whether this dashboard has a non-empty saved filter snapshot.
     */
    public static function hasPersistedFilters(Dashboard $dashboard): bool
    {
        $j = $dashboard->filters_json;

        return is_array($j) && $j !== [];
    }

    /**
     * Query string parameters mirroring {@see resources/js/lib/dashboardFilters.ts} `filtersToQueryRecord`.
     *
     * @param  array<string, mixed>  $saved  Normalized {@see \App\DTO\FilterRequest::toResponseArray()} shape.
     * @return array<string, string>
     */
    public static function redirectQueryFromSaved(array $saved): array
    {
        $q = [];
        if (! empty($saved['date_from'])) {
            $q['date_from'] = (string) $saved['date_from'];
        }
        if (! empty($saved['date_to'])) {
            $q['date_to'] = (string) $saved['date_to'];
        }

        foreach (['source', 'status', 'vertical', 'sol', 'state', 'supplier_code', 'buyer_code'] as $key) {
            $v = $saved[$key] ?? null;
            if ($v !== null && $v !== '') {
                $q[$key] = (string) $v;
            }
        }

        $cf = $saved['custom_filters'] ?? [];
        if (is_array($cf) && count($cf) > 0) {
            $q['custom_filters'] = json_encode(array_values($cf));
        }

        return $q;
    }

    /**
     * Full URL with query for a dashboard show visit.
     */
    public static function showUrlWithFiltersQuery(Dashboard $dashboard, array $saved): string
    {
        $query = self::redirectQueryFromSaved($saved);
        $base = route('dashboards.show', $dashboard);

        return $query === [] ? $base : $base.'?'.http_build_query($query);
    }
}
