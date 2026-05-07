<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class PhoneVerificationBreakdownMetric extends BreakdownTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'phone_verification',
            'Phone verification',
            'Breakdown by phone verification flag or label.',
            'breakdowns',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getPhoneVerificationBreakdown();
    }
}
