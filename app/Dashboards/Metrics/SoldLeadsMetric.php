<?php

namespace App\Dashboards\Metrics;

final class SoldLeadsMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'sold',
            'Sold leads',
            'Leads with status sold in the filtered period.',
            'number',
            'overview',
            'sold',
        );
    }
}
