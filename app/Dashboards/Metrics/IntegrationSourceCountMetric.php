<?php

namespace App\Dashboards\Metrics;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Count of {@see IntegrationFact} rows for one source in the dashboard date range,
 * or sum of a numeric measure across those rows.
 *
 * Widget {@see DashboardWidget::$configJson}:
 * - `integration_source_id` (int, required)
 * - `integration_kpi_mode` (string, optional): `rows` (default) or `sum`
 * - `integration_kpi_measure` (string, required when mode is `sum`): key under {@see IntegrationFact::$measures}
 */
final class IntegrationSourceCountMetric extends Metric
{
    public function key(): string
    {
        return 'integration_source_count';
    }

    public function label(): string
    {
        return 'Integration source (count)';
    }

    public function description(): string
    {
        return 'Number of ingested rows for a single integration source in the selected period.';
    }

    public function type(): string
    {
        return 'scalar';
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
        return ['kpi_card'];
    }

    public function query(array $filters, ?Carbon $from, ?Carbon $to, array $widgetConfig = []): array
    {
        $userId = Auth::id();
        if ($userId === null) {
            return ['value' => 0];
        }

        $sourceId = (int) ($widgetConfig['integration_source_id'] ?? 0);
        if ($sourceId <= 0) {
            return ['value' => 0];
        }

        $owns = IntegrationSource::query()
            ->whereKey($sourceId)
            ->where('user_id', $userId)
            ->exists();

        if (! $owns) {
            return ['value' => 0];
        }

        $filters = $this->mergeDateRange($filters, $from, $to);
        $fromDay = Carbon::parse((string) ($filters['date_from'] ?? now()->startOfMonth()))->startOfDay();
        $toDay = Carbon::parse((string) ($filters['date_to'] ?? now()->endOfMonth()))->endOfDay();

        $mode = (string) ($widgetConfig['integration_kpi_mode'] ?? 'rows');

        if ($mode === 'sum') {
            $measureKey = trim((string) ($widgetConfig['integration_kpi_measure'] ?? ''));
            if ($measureKey === '') {
                return ['value' => 0];
            }

            $total = 0.0;
            IntegrationFact::query()
                ->where('integration_source_id', $sourceId)
                ->whereRaw('COALESCE(occurred_at, created_at) BETWEEN ? AND ?', [$fromDay, $toDay])
                ->select(['id', 'measures'])
                ->orderBy('id')
                ->chunkById(1000, function ($facts) use ($measureKey, &$total): void {
                    foreach ($facts as $fact) {
                        $v = data_get($fact->measures, $measureKey);
                        if (is_numeric($v)) {
                            $total += (float) $v;
                        }
                    }
                });

            return ['value' => $total];
        }

        $count = IntegrationFact::query()
            ->where('integration_source_id', $sourceId)
            ->whereRaw('COALESCE(occurred_at, created_at) BETWEEN ? AND ?', [$fromDay, $toDay])
            ->count();

        return ['value' => $count];
    }
}
