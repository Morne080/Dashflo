<?php

namespace App\Dashboards\Metrics;

use App\Services\MetricsService;

final class SuppliersPerformanceMetric extends GroupedTableMetric
{
    public function __construct()
    {
        parent::__construct(
            'suppliers_performance',
            'Suppliers performance',
            'Per-supplier and lead-type performance blocks.',
            'tables',
        );
    }

    protected function fetchRows(MetricsService $svc): array
    {
        return $svc->getSupplierPerformance();
    }
}
