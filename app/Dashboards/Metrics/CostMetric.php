<?php

namespace App\Dashboards\Metrics;

final class CostMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'cost',
            'Cost',
            'Total acquisition cost for the filtered leads.',
            'currency',
            'overview',
            'cost',
        );
    }
}
