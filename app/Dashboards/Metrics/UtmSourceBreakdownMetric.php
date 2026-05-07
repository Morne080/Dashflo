<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class UtmSourceBreakdownMetric extends BreakdownTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'utm_source',
            'UTM source',
            'Marketing performance by UTM source.',
            'breakdowns',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getUtmSourceBreakdown();
    }
}
