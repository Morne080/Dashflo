<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class AccidentSolBreakdownMetric extends BreakdownTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'accident_date',
            'Accident date (SOL)',
            'Performance by accident SOL bucket.',
            'breakdowns',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getAccidentSolBreakdown();
    }
}
