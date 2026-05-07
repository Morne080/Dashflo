<?php

namespace App\Dashboards\Metrics;

final class RevenueMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'revenue',
            'Revenue',
            'Gross revenue for the active dashboard filters.',
            'currency',
            'overview',
            'revenue',
        );
    }
}
