<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class InjuryTypeMetric extends BreakdownTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'injury_type',
            'Injury type',
            'Injury type distribution with conversions and GP margin.',
            'breakdowns',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getInjuryTypeBreakdown();
    }
}
