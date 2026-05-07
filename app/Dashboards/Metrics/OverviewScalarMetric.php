<?php

namespace App\Dashboards\Metrics;

use App\DTO\FilterRequest;
use App\Services\MetricsService;
use Carbon\Carbon;

/**
 * Scalar value from {@see MetricsService::getOverviewKpis()}.
 */
abstract class OverviewScalarMetric extends Metric
{
    /**
     * @param  non-empty-string  $overviewField  Key inside the overview KPI array
     */
    public function __construct(
        protected readonly string $metricKey,
        protected readonly string $metricLabel,
        protected readonly string $metricDescription,
        protected readonly string $metricFormat,
        protected readonly string $metricCategory,
        protected readonly string $overviewField,
    ) {}

    public function key(): string
    {
        return $this->metricKey;
    }

    public function label(): string
    {
        return $this->metricLabel;
    }

    public function description(): string
    {
        return $this->metricDescription;
    }

    public function type(): string
    {
        return 'scalar';
    }

    public function format(): string
    {
        return $this->metricFormat;
    }

    public function category(): string
    {
        return $this->metricCategory;
    }

    public function query(array $filters, ?Carbon $from, ?Carbon $to, array $widgetConfig = []): array
    {
        $filters = $this->mergeDateRange($filters, $from, $to);
        $overview = (new MetricsService(FilterRequest::fromDashboardFilters($filters)))->getOverviewKpis();

        return ['value' => $overview[$this->overviewField] ?? 0];
    }

    public function compatibleWidgets(): array
    {
        return ['kpi_card'];
    }
}
