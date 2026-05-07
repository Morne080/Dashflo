<?php

namespace App\Dashboards\Metrics;

final class TotalLeadsMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'total_leads',
            'Total leads',
            'Count of leads matching the active filters.',
            'number',
            'overview',
            'total_leads',
        );
    }
}
