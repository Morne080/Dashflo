<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class DailyRevenueMetric extends TimeseriesMetric
{
    public function __construct()
    {
        parent::__construct(
            'daily_revenue',
            'Daily revenue',
            'Per-day revenue across the selected range (includes prior-period values per day index).',
            'currency',
            'revenue',
        );
    }

    protected function fetchPoints(MetricsService $svc): array
    {
        return $svc->getSparklineSeries('revenue');
    }
}
