<?php

namespace App\Dashboards\Metrics;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Tabular rows from {@see IntegrationFact} for a single {@see IntegrationSource}, with user-selected columns.
 *
 * Widget {@see DashboardWidget::$configJson}:
 * - `integration_source_id` (int, required)
 * - `columns` (list<array{path: string, header?: string}>); when empty, defaults to occurred_at + external_id
 */
final class IntegrationSourceTableMetric extends Metric
{
    private const MAX_ROWS = 500;

    public function key(): string
    {
        return 'integration_source_table';
    }

    public function label(): string
    {
        return 'Integration source (table)';
    }

    public function description(): string
    {
        return 'Rows from one integration source with dimensions, measures, and timestamps you choose.';
    }

    public function type(): string
    {
        return 'grouped';
    }

    public function format(): string
    {
        return 'number';
    }

    public function category(): string
    {
        return 'integrations';
    }

    public function compatibleWidgets(): array
    {
        return ['data_table'];
    }

    public function query(array $filters, ?Carbon $from, ?Carbon $to, array $widgetConfig = []): array
    {
        $userId = Auth::id();
        if ($userId === null) {
            return ['rows' => []];
        }

        $sourceId = (int) ($widgetConfig['integration_source_id'] ?? 0);
        if ($sourceId <= 0) {
            return ['rows' => []];
        }

        $source = IntegrationSource::query()
            ->whereKey($sourceId)
            ->where('user_id', $userId)
            ->first();

        if ($source === null) {
            return ['rows' => []];
        }

        $filters = $this->mergeDateRange($filters, $from, $to);
        $fromDay = Carbon::parse((string) ($filters['date_from'] ?? now()->startOfMonth()))->startOfDay();
        $toDay = Carbon::parse((string) ($filters['date_to'] ?? now()->endOfMonth()))->endOfDay();

        $columns = $widgetConfig['columns'] ?? [];
        if (! is_array($columns) || $columns === []) {
            $columns = [
                ['path' => 'occurred_at', 'header' => 'Occurred at'],
                ['path' => 'external_id', 'header' => 'External ID'],
            ];
        }

        $normalized = [];
        foreach ($columns as $col) {
            if (! is_array($col)) {
                continue;
            }
            $path = trim((string) ($col['path'] ?? ''));
            if ($path === '') {
                continue;
            }
            $header = trim((string) ($col['header'] ?? ''));
            $normalized[] = [
                'path' => $path,
                'header' => $header !== '' ? $header : $path,
                'accessor' => self::pathToAccessor($path),
            ];
        }

        if ($normalized === []) {
            $normalized = [
                ['path' => 'occurred_at', 'header' => 'Occurred at', 'accessor' => self::pathToAccessor('occurred_at')],
                ['path' => 'external_id', 'header' => 'External ID', 'accessor' => self::pathToAccessor('external_id')],
            ];
        }

        $facts = IntegrationFact::query()
            ->where('integration_source_id', $source->id)
            ->whereRaw('COALESCE(occurred_at, created_at) BETWEEN ? AND ?', [$fromDay, $toDay])
            ->orderByDesc('id')
            ->limit(self::MAX_ROWS)
            ->get();

        $rows = [];
        foreach ($facts as $fact) {
            $row = [];
            foreach ($normalized as $col) {
                $row[$col['accessor']] = self::valueAtPath($fact, $col['path']);
            }
            $rows[] = $row;
        }

        return ['rows' => $rows];
    }

    private static function pathToAccessor(string $path): string
    {
        return str_replace(['.', ' '], ['__', '_'], strtolower(trim($path)));
    }

    /**
     * @return scalar|null
     */
    private static function valueAtPath(IntegrationFact $fact, string $path): mixed
    {
        $path = trim($path);
        if ($path === 'external_id') {
            return $fact->external_id;
        }
        if ($path === 'occurred_at') {
            return $fact->occurred_at?->toIso8601String();
        }
        if ($path === 'created_at') {
            return $fact->created_at?->toIso8601String();
        }
        if ($path === 'id') {
            return $fact->id;
        }

        if (str_starts_with($path, 'dimensions.')) {
            $key = substr($path, strlen('dimensions.'));

            return data_get($fact->dimensions, $key);
        }

        if (str_starts_with($path, 'measures.')) {
            $key = substr($path, strlen('measures.'));

            return data_get($fact->measures, $key);
        }

        return null;
    }
}
