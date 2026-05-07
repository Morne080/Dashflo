<?php

namespace App\Dashboards\Metrics;

final class ConvRateMetric extends OverviewScalarMetric
{
    public function __construct()
    {
        parent::__construct(
            'conv_rate',
            'Conversion rate',
            'Conversions divided by sold leads, as a percentage.',
            'percent',
            'overview',
            'conv_rate',
        );
    }
}
