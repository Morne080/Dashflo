<?php

namespace App\Dashboards\Metrics;

final class ProfitMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'profit',
            'Profit',
            'IPL-based profit for the filtered period.',
            'currency',
            'overview',
            'profit',
        );
    }
}
