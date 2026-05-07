<?php

namespace App\Dashboards;

use App\Dashboards\Metrics\Metric;
use App\Dashboards\Widgets\WidgetType;
use Illuminate\Support\Collection;
use InvalidArgumentException;

final class Registry
{
    /** @var array<string, WidgetType> */
    private array $widgets = [];

    /** @var array<string, Metric> */
    private array $metrics = [];

    public function register(WidgetType|Metric $definition): void
    {
        if ($definition instanceof WidgetType) {
            $this->widgets[$definition->key()] = $definition;

            return;
        }

        $this->metrics[$definition->key()] = $definition;
    }

    /**
     * @return Collection<string, WidgetType>
     */
    public function widgets(): Collection
    {
        return collect($this->widgets)->sortKeys();
    }

    /**
     * @return Collection<string, Metric>
     */
    public function metrics(): Collection
    {
        return collect($this->metrics)->sortKeys();
    }

    public function widget(string $key): WidgetType
    {
        if (! isset($this->widgets[$key])) {
            throw new InvalidArgumentException("Unknown widget type [{$key}].");
        }

        return $this->widgets[$key];
    }

    public function metric(string $key): Metric
    {
        if (! isset($this->metrics[$key])) {
            throw new InvalidArgumentException("Unknown metric [{$key}].");
        }

        return $this->metrics[$key];
    }

    /**
     * @return Collection<string, Metric>
     */
    public function metricsForWidget(string $widgetKey): Collection
    {
        $widget = $this->widget($widgetKey);
        $types = $widget->supportedMetricTypes();

        return $this->metrics()->filter(
            fn (Metric $metric) => in_array($metric->type(), $types, true),
        )->values();
    }

    /**
     * @return Collection<string, WidgetType>
     */
    public function widgetsForMetric(string $metricKey): Collection
    {
        $metric = $this->metric($metricKey);

        return $this->widgets()->filter(
            fn (WidgetType $widget) => in_array($metric->type(), $widget->supportedMetricTypes(), true),
        )->values();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializeWidgets(): array
    {
        return $this->widgets()->values()->map(
            fn (WidgetType $w) => $w->toDefinition(),
        )->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializeMetrics(): array
    {
        return $this->metrics()->values()->map(
            fn (Metric $m) => $m->toDefinition(),
        )->all();
    }
}
