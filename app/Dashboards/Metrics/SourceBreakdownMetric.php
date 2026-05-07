<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

/**
 * Lead marketing `leads.source` (distinct from UTM campaign source).
 */
final class SourceBreakdownMetric extends BreakdownTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'source_breakdown',
            'Lead source',
            'Volume and quality by lead acquisition source.',
            'breakdowns',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getSourceBreakdown();
    }
}
