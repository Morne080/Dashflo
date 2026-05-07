<?php

namespace App\Providers;

use App\Dashboards\Metrics\AccidentSolBreakdownMetric;
use App\Dashboards\Metrics\BuyersPerformanceMetric;
use App\Dashboards\Metrics\ConvRateMetric;
use App\Dashboards\Metrics\CostMetric;
use App\Dashboards\Metrics\CplMetric;
use App\Dashboards\Metrics\DailyMetricsMetric;
use App\Dashboards\Metrics\DailyRevenueMetric;
use App\Dashboards\Metrics\DispositionBreakdownMetric;
use App\Dashboards\Metrics\GpMarginMetric;
use App\Dashboards\Metrics\InjuryTypeMetric;
use App\Dashboards\Metrics\IntegrationSourceCountMetric;
use App\Dashboards\Metrics\IntegrationSourceTableMetric;
use App\Dashboards\Metrics\Metric;
use App\Dashboards\Metrics\NetProfitMetric;
use App\Dashboards\Metrics\NetRevenueMetric;
use App\Dashboards\Metrics\PhoneVerificationBreakdownMetric;
use App\Dashboards\Metrics\ProfitMetric;
use App\Dashboards\Metrics\RevenueMetric;
use App\Dashboards\Metrics\SoldLeadsMetric;
use App\Dashboards\Metrics\SourceBreakdownMetric;
use App\Dashboards\Metrics\StatesPerformanceMetric;
use App\Dashboards\Metrics\SuppliersPerformanceMetric;
use App\Dashboards\Metrics\TotalLeadsMetric;
use App\Dashboards\Metrics\TreatmentTimeBreakdownMetric;
use App\Dashboards\Metrics\UtmSourceBreakdownMetric;
use App\Dashboards\Registry;
use App\Dashboards\Widgets\BarChartWidget;
use App\Dashboards\Widgets\DataTableWidget;
use App\Dashboards\Widgets\KpiCardWidget;
use App\Dashboards\Widgets\LineChartWidget;
use App\Dashboards\Widgets\PieChartWidget;
use App\Dashboards\Widgets\WidgetType;
use Illuminate\Support\ServiceProvider;

class DashboardRegistryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Registry::class, function (): Registry {
            $registry = new Registry;

            foreach ($this->widgetTypes() as $widget) {
                $registry->register($widget);
            }

            foreach ($this->metricDefinitions() as $metric) {
                $registry->register($metric);
            }

            return $registry;
        });
    }

    /**
     * @return iterable<int, WidgetType>
     */
    private function widgetTypes(): iterable
    {
        yield new KpiCardWidget;
        yield new LineChartWidget;
        yield new BarChartWidget;
        yield new DataTableWidget;
        yield new PieChartWidget;
    }

    /**
     * @return iterable<int, Metric>
     */
    private function metricDefinitions(): iterable
    {
        yield new RevenueMetric;
        yield new NetRevenueMetric;
        yield new CostMetric;
        yield new CplMetric;
        yield new ProfitMetric;
        yield new NetProfitMetric;
        yield new ConvRateMetric;
        yield new GpMarginMetric;
        yield new TotalLeadsMetric;
        yield new SoldLeadsMetric;
        yield new DailyRevenueMetric;
        yield new DailyMetricsMetric;
        yield new BuyersPerformanceMetric;
        yield new SuppliersPerformanceMetric;
        yield new StatesPerformanceMetric;
        yield new DispositionBreakdownMetric;
        yield new InjuryTypeMetric;
        yield new AccidentSolBreakdownMetric;
        yield new TreatmentTimeBreakdownMetric;
        yield new PhoneVerificationBreakdownMetric;
        yield new UtmSourceBreakdownMetric;
        yield new SourceBreakdownMetric;
        yield new IntegrationSourceTableMetric;
        yield new IntegrationSourceCountMetric;
    }
}
