<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class BuyersPerformanceMetric extends GroupedTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'buyers_performance',
            'Buyers performance',
            'Per-buyer pipeline, economics, and conversion quality.',
            'tables',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getBuyerPerformance();
    }
}
