<?php

namespace App\Dashboards\Metrics;

use App\DTO\FilterRequest;
use App\Services\MetricsService;
use Carbon\Carbon;

/**
 * Ordered points suitable for line/area charts.
 */
abstract class TimeseriesMetric extends Metric
{
    public function __construct(
        protected readonly string $metricKey,
        protected readonly string $metricLabel,
        protected readonly string $metricDescription,
        protected readonly string $metricFormat,
        protected readonly string $metricCategory,
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
        return 'timeseries';
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
        $svc = new MetricsService(FilterRequest::fromDashboardFilters($filters));

        return ['points' => $this->fetchPoints($svc)];
    }

    /**
     * @return list<array{date: string, value: float|int, prev_value?: float|int}>
     */
    abstract protected function fetchPoints(MetricsService $svc): array;

    public function compatibleWidgets(): array
    {
        return ['line_chart'];
    }
}
