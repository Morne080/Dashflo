<?php

namespace App\Dashboards\Widgets;

use App\Dashboards\Metrics\Metric;

/**
 * Code-defined catalog entry for a dashboard widget (layout + config contract).
 */
abstract class WidgetType
{
    abstract public function key(): string;

    abstract public function label(): string;

    /** Lucide icon export name (PascalCase), e.g. "LineChart". */
    abstract public function icon(): string;

    abstract public function description(): string;

    /**
     * @return 'scorecard'|'chart'|'table'|string
     */
    abstract public function category(): string;

    /**
     * Which {@see Metric::type()} values this widget can render.
     *
     * @return list<string>
     */
    abstract public function supportedMetricTypes(): array;

    /**
     * Default persisted `config_json` when a widget is added.
     *
     * @return array<string, mixed>
     */
    abstract public function defaultConfig(): array;

    /**
     * Field definitions for a future config UI (name, label, type, options, default).
     *
     * @return list<array{name: string, label: string, type: string, options?: array<int|string, mixed>, default?: mixed}>
     */
    abstract public function configSchema(): array;

    /**
     * Default react-grid-layout footprint (12-column grid).
     *
     * @return array{w: int, h: int}
     */
    abstract public function defaultSize(): array;

    /**
     * @return array<string, mixed>
     */
    public function toDefinition(): array
    {
        return [
            'key' => $this->key(),
            'label' => $this->label(),
            'icon' => $this->icon(),
            'description' => $this->description(),
            'category' => $this->category(),
            'supported_metric_types' => $this->supportedMetricTypes(),
            'default_config' => $this->defaultConfig(),
            'config_schema' => $this->configSchema(),
            'default_size' => $this->defaultSize(),
        ];
    }
}
