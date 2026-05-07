<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class DispositionBreakdownMetric extends BreakdownTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'disposition_report',
            'Disposition report',
            'Lead disposition labels with counts and returns.',
            'breakdowns',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getDispositionBreakdown();
    }
}
