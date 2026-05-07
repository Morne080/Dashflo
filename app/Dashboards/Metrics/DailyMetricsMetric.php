<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class DailyMetricsMetric extends GroupedTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'daily_metrics',
            'Daily metrics',
            'One row per calendar day with volume, revenue, CPL, and quality rates.',
            'tables',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getDailyMetrics();
    }
}
