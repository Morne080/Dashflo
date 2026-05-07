<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class TreatmentTimeBreakdownMetric extends BreakdownTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'treatment_time',
            'Treatment time',
            'Performance grouped by treatment-time bucket.',
            'breakdowns',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getTreatmentTimeBreakdown();
    }
}
