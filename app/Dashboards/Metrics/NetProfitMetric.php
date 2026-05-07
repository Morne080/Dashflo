<?php

namespace App\Dashboards\Metrics;

final class NetProfitMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'net_profit',
            'Net profit',
            'Net profit (IPL aggregate) for the filtered period.',
            'currency',
            'overview',
            'net_profit',
        );
    }
}
