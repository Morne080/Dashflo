<?php

namespace App\Dashboards\Metrics;

final class NetRevenueMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'net_revenue',
            'Net revenue',
            'Revenue from sold or converted leads only.',
            'currency',
            'overview',
            'net_revenue',
        );
    }
}
