<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class StatesPerformanceMetric extends GroupedTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'states_performance',
            'States performance',
            'Vertical × state performance rollups.',
            'tables',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getStatePerformance();
    }
}
