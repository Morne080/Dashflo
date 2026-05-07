<?php

namespace App\Dashboards\Metrics;

final class GpMarginMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'gp_margin',
            'GP margin',
            'Gross profit margin (profit over revenue).',
            'percent',
            'overview',
            'gp_margin',
        );
    }
}
