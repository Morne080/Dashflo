<?php

namespace App\Dashboards\Metrics;

final class CplMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'cpl',
            'CPL',
            'Cost per lead (cost divided by total leads).',
            'currency',
            'overview',
            'cpl',
        );
    }
}
