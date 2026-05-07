<?php

namespace App\Dashboards\Metrics;

use App\Dashboards\Widgets\WidgetType;
use App\DTO\FilterRequest;
use App\Services\MetricsService;
use Carbon\Carbon;

/**
 * Code-defined catalog entry for a measurable slice of data (backed by {@see MetricsService}).
 */
abstract class Metric
{
    abstract public function key(): string;

    abstract public function label(): string;

    abstract public function description(): string;

    /**
     * @return 'scalar'|'timeseries'|'grouped'|'breakdown'
     */
    abstract public function type(): string;

    /**
     * Primary display hint for scalar values; use "number" for tabular / multi-column datasets.
     *
     * @return 'currency'|'number'|'percent'|string
     */
    abstract public function format(): string;

    abstract public function category(): string;

    /**
     * @param  array<string, mixed>  $filters  snake_case keys matching {@see FilterRequest::toArray()}
     * @param  array<string, mixed>  $widgetConfig  Persisted {@see DashboardWidget::$configJson} for configurable metrics
     * @return array<string, mixed> Shape depends on {@see static::type()}
     */
    abstract public function query(array $filters, ?Carbon $from, ?Carbon $to, array $widgetConfig = []): array;

    /**
     * @return list<string> {@see WidgetType::key()} values
     */
    abstract public function compatibleWidgets(): array;

    /**
     * @return array<string, mixed>
     */
    public function toDefinition(): array
    {
        return [
            'key' => $this->key(),
            'label' => $this->label(),
            'description' => $this->description(),
            'type' => $this->type(),
            'format' => $this->format(),
            'category' => $this->category(),
            'compatible_widgets' => $this->compatibleWidgets(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function mergeDateRange(array $filters, ?Carbon $from, ?Carbon $to): array
    {
        if ($from !== null) {
            $filters['date_from'] = $from->toDateString();
        }
        if ($to !== null) {
            $filters['date_to'] = $to->toDateString();
        }

        return $filters;
    }
}
