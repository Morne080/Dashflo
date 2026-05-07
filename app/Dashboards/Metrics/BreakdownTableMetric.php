<?php

namespace App\Dashboards\Metrics;

use App\DTO\FilterRequest;
use App\Services\MetricsService;
use Carbon\Carbon;

/**
 * Categorical breakdown rows (disposition, injury type, etc.).
 */
abstract class BreakdownTableMetric extends Metric
{
    public function __construct(
        protected readonly string $metricKey,
        protected readonly string $metricLabel,
        protected readonly string $metricDescription,
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
        return 'breakdown';
    }

    public function format(): string
    {
        return 'number';
    }

    public function category(): string
    {
        return $this->metricCategory;
    }

    public function query(array $filters, ?Carbon $from, ?Carbon $to, array $widgetConfig = []): array
    {
        $filters = $this->mergeDateRange($filters, $from, $to);
        $svc = new MetricsService(FilterRequest::fromDashboardFilters($filters));

        return ['rows' => $this->fetchRows($svc)];
    }

    /**
     * @return list<array<string, mixed>>
     */
    abstract protected function fetchRows(MetricsService $svc): array;

    public function compatibleWidgets(): array
    {
        return ['data_table', 'bar_chart', 'pie_chart'];
    }
}
