<?php

namespace App\Services;

use App\DTO\FilterRequest;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Lead-generation analytics: Query Builder aggregations, 60s cache per filter key.
 *
 * Rates: conv_rate = conversions/sold*100, return_rate = returns/sold*100,
 * gp_margin = profit/revenue*100, true_cpl = cost/sold, cpl = cost/total_leads.
 */
class MetricsService
{
    public function __construct(
        private readonly FilterRequest $filters,
    ) {}

    /**
     * Current period, previous period of equal length, and % change for KPIs.
     *
     * @return array<string, float|int>
     */
    public function getOverviewKpis(): array
    {
        return $this->remember('overview', function () {
            $curr = $this->aggregatePeriod($this->filters);
            $prev = $this->aggregatePeriod($this->filters->previousPeriod());

            $convRate = $this->safeRatePct($curr['conversions'], $curr['sold']);
            $convRatePrev = $this->safeRatePct($prev['conversions'], $prev['sold']);

            $returnRate = $this->safeRatePct($curr['returns'], $curr['sold']);
            $returnRatePrev = $this->safeRatePct($prev['returns'], $prev['sold']);

            $gpMargin = $this->safeRatePct($curr['profit'], $curr['revenue']);
            $gpMarginPrev = $this->safeRatePct($prev['profit'], $prev['revenue']);

            $cpl = $this->safeDiv($curr['cost'], $curr['total_leads']);
            $cplPrev = $this->safeDiv($prev['cost'], $prev['total_leads']);

            $trueCpl = $this->safeDiv($curr['cost'], $curr['sold']);
            $trueCplPrev = $this->safeDiv($prev['cost'], $prev['sold']);

            return [
                'total_leads' => (int) $curr['total_leads'],
                'returns' => (int) $curr['returns'],
                'sold' => (int) $curr['sold'],
                'dqs' => (int) $curr['dqs'],
                'unsold' => (int) $curr['unsold'],
                'conversions' => (int) $curr['conversions'],
                'fakes' => (int) $curr['fakes'],
                'conv_rate' => $convRate,
                'gp_margin' => $gpMargin,
                'revenue' => $curr['revenue'],
                'net_revenue' => $curr['net_revenue'],
                'cost' => $curr['cost'],
                'cpl' => $cpl,
                'true_cpl' => $trueCpl,
                'profit' => $curr['profit'],
                'net_profit' => $curr['net_profit'],
                'return_rate' => $returnRate,

                'total_leads_prev' => (int) $prev['total_leads'],
                'returns_prev' => (int) $prev['returns'],
                'sold_prev' => (int) $prev['sold'],
                'dqs_prev' => (int) $prev['dqs'],
                'unsold_prev' => (int) $prev['unsold'],
                'conversions_prev' => (int) $prev['conversions'],
                'fakes_prev' => (int) $prev['fakes'],
                'revenue_prev' => $prev['revenue'],
                'net_revenue_prev' => $prev['net_revenue'],
                'cost_prev' => $prev['cost'],
                'cpl_prev' => $cplPrev,
                'true_cpl_prev' => $trueCplPrev,
                'profit_prev' => $prev['profit'],
                'net_profit_prev' => $prev['net_profit'],
                'conv_rate_prev' => $convRatePrev,
                'gp_margin_prev' => $gpMarginPrev,
                'return_rate_prev' => $returnRatePrev,

                'total_leads_change_pct' => $this->pctChange((float) $curr['total_leads'], (float) $prev['total_leads']),
                'returns_change_pct' => $this->pctChange((float) $curr['returns'], (float) $prev['returns']),
                'sold_change_pct' => $this->pctChange((float) $curr['sold'], (float) $prev['sold']),
                'dqs_change_pct' => $this->pctChange((float) $curr['dqs'], (float) $prev['dqs']),
                'unsold_change_pct' => $this->pctChange((float) $curr['unsold'], (float) $prev['unsold']),
                'conversions_change_pct' => $this->pctChange((float) $curr['conversions'], (float) $prev['conversions']),
                'fakes_change_pct' => $this->pctChange((float) $curr['fakes'], (float) $prev['fakes']),
                'revenue_change_pct' => $this->pctChange($curr['revenue'], $prev['revenue']),
                'net_revenue_change_pct' => $this->pctChange($curr['net_revenue'], $prev['net_revenue']),
                'cost_change_pct' => $this->pctChange($curr['cost'], $prev['cost']),
                'cpl_change_pct' => $this->pctChange($cpl, $cplPrev),
                'true_cpl_change_pct' => $this->pctChange($trueCpl, $trueCplPrev),
                'profit_change_pct' => $this->pctChange($curr['profit'], $prev['profit']),
                'net_profit_change_pct' => $this->pctChange($curr['net_profit'], $prev['net_profit']),
                'conv_rate_change_pct' => $this->pctChange($convRate, $convRatePrev),
                'gp_margin_change_pct' => $this->pctChange($gpMargin, $gpMarginPrev),
                'return_rate_change_pct' => $this->pctChange($returnRate, $returnRatePrev),
            ];
        });
    }

    /**
     * One row per calendar day in the filter range (zeros when no rows).
     *
     * @return list<array<string, mixed>>
     */
    public function getDailyMetrics(): array
    {
        return $this->remember('daily', function () {
            $from = Carbon::parse($this->filters->dateFrom)->startOfDay();
            $to = Carbon::parse($this->filters->dateTo)->startOfDay();
            $rows = $this->dailyAggregateQuery($this->filters)->get()->keyBy('date');

            $out = [];
            for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
                $key = $d->toDateString();
                $r = $rows->get($key);
                $total = (int) ($r->total ?? 0);
                $sold = (int) ($r->sold ?? 0);
                $returns = (int) ($r->returns ?? 0);
                $unsold = (int) ($r->unsold ?? 0);
                $dq = (int) ($r->dq ?? 0);
                $revenue = $this->roundMoney((float) ($r->revenue ?? 0));
                $cost = $this->roundMoney((float) ($r->cost ?? 0));
                $conversions = (int) ($r->conversions ?? 0);
                $profit = $this->roundMoney((float) ($r->profit ?? 0));
                $ipl = $this->roundMoney((float) ($r->ipl ?? 0));

                $out[] = [
                    'date' => $key,
                    'total' => $total,
                    'sold' => $sold,
                    'unsold' => $unsold,
                    'return_pct' => $this->safeRatePct($returns, $sold),
                    'dq' => $dq,
                    'revenue' => $revenue,
                    'cost' => $cost,
                    'cpl' => $this->safeDiv($cost, $total),
                    'ipl' => $ipl,
                    'net_profit' => $profit,
                    'profit' => $profit,
                    'gp_margin' => $this->safeRatePct($profit, $revenue),
                    'conversions' => $conversions,
                    'conv_rate' => $this->safeRatePct($conversions, $sold),
                ];
            }

            return $out;
        });
    }

    /**
     * Per-buyer aggregates plus a final grand-total row (buyer_id null, vertical ALL).
     *
     * @return list<array<string, mixed>>
     */
    public function getBuyerPerformance(): array
    {
        return $this->remember('buyers', function () {
            $q = $this->baseQuery($this->filters)
                ->whereNotNull('leads.buyer_id');

            $rows = $q->clone()
                ->groupBy('buyers.id', 'buyers.buyer_code', 'buyers.vertical')
                ->selectRaw('
                    buyers.id as buyer_id,
                    buyers.buyer_code as buyer_code,
                    buyers.vertical as vertical,
                    COUNT(*) as total,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                    SUM(leads.revenue) as revenue,
                    SUM(leads.cost) as cost,
                    SUM(leads.ipl) as ipl,
                    SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions
                ', ['sold', 'returned'])
                ->orderByDesc('total')
                ->get();

            $grand = $this->rollupPerformanceRow($q->clone());

            $mapped = $rows->map(fn ($r) => $this->mapPerformanceRow(
                $r,
                (int) $r->buyer_id,
                (string) $r->vertical,
                false,
                (string) $r->buyer_code,
            ))->values()->all();

            return array_merge($mapped, [$this->mapPerformanceRow($grand, null, 'ALL', true, null)]);
        });
    }

    /**
     * Per supplier_code × lead_type, plus grand total row.
     *
     * @return list<array<string, mixed>>
     */
    public function getSupplierPerformance(): array
    {
        return $this->remember('suppliers', function () {
            $q = $this->baseQuery($this->filters);

            $rows = $q->clone()
                ->groupBy('suppliers.id', 'suppliers.supplier_code', 'leads.lead_type')
                ->selectRaw('
                    suppliers.id as supplier_id,
                    suppliers.supplier_code as supplier_code,
                    leads.lead_type as lead_type,
                    COUNT(*) as total,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                    SUM(leads.revenue) as revenue,
                    SUM(leads.cost) as cost,
                    SUM(leads.ipl) as ipl,
                    SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions
                ', ['sold', 'returned'])
                ->orderBy('suppliers.supplier_code')
                ->orderBy('leads.lead_type')
                ->get();

            $grand = $this->rollupPerformanceRow($q->clone());

            $mapped = $rows->map(fn ($r) => $this->mapSupplierPerformanceRow($r))->values()->all();

            $totalRow = $this->mapSupplierPerformanceRow($grand, null, 'TOTAL', 'ALL', true);

            return array_merge($mapped, [$totalRow]);
        });
    }

    /**
     * Per vertical × state.
     *
     * @return list<array<string, mixed>>
     */
    public function getStatePerformance(): array
    {
        return $this->remember('states', function () {
            $q = $this->baseQuery($this->filters);

            return $q->clone()
                ->groupBy('leads.vertical', 'leads.state')
                ->selectRaw('
                    leads.vertical as vertical,
                    leads.state as state,
                    COUNT(*) as total,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                    SUM(leads.revenue) as revenue,
                    SUM(leads.cost) as cost,
                    SUM(leads.ipl) as ipl,
                    SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions
                ', ['sold', 'returned'])
                ->orderByDesc('total')
                ->get()
                ->map(function ($r) {
                    $total = (int) $r->total;
                    $sold = (int) $r->sold;
                    $returns = (int) $r->returns;
                    $revenue = $this->roundMoney((float) $r->revenue);
                    $cost = $this->roundMoney((float) $r->cost);
                    $ipl = $this->roundMoney((float) $r->ipl);
                    $conversions = (int) $r->conversions;

                    return [
                        'vertical' => $r->vertical,
                        'state' => $r->state,
                        'total' => $total,
                        'sold' => $sold,
                        'returns' => $returns,
                        'return_rate' => $this->safeRatePct($returns, $sold),
                        'revenue' => $revenue,
                        'cost' => $cost,
                        'cpl' => $this->safeDiv($cost, $total),
                        'ipl' => $ipl,
                        'net_profit' => $ipl,
                        'gp_margin' => $this->safeRatePct($ipl, $revenue),
                        'conversions' => $conversions,
                        'conv_rate' => $this->safeRatePct($conversions, $sold),
                    ];
                })
                ->values()
                ->all();
        });
    }

    /**
     * disposition → feedback label, lead count, returns.
     *
     * @return list<array<string, mixed>>
     */
    public function getDispositionBreakdown(): array
    {
        return $this->remember('disposition', function () {
            return $this->baseQuery($this->filters)
                ->groupBy('leads.disposition')
                ->selectRaw('
                    COALESCE(leads.disposition, \'(blank)\') as feedback,
                    COUNT(*) as leads,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns
                ', ['returned'])
                ->orderByDesc('leads')
                ->get()
                ->map(fn ($r) => [
                    'feedback' => $r->feedback,
                    'leads' => (int) $r->leads,
                    'returns' => (int) $r->returns,
                ])
                ->all();
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getInjuryTypeBreakdown(): array
    {
        return $this->remember('injury', function () {
            return $this->baseQuery($this->filters)
                ->groupBy('leads.injury_type')
                ->selectRaw('
                    COALESCE(leads.injury_type, \'(blank)\') as injury_type,
                    COUNT(*) as record_count,
                    SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                    SUM(leads.revenue) as revenue,
                    SUM(leads.ipl) as ipl
                ', ['sold'])
                ->orderByDesc('record_count')
                ->get()
                ->map(function ($r) {
                    $revenue = $this->roundMoney((float) ($r->revenue ?? 0));
                    $ipl = $this->roundMoney((float) ($r->ipl ?? 0));

                    return [
                        'injury_type' => $r->injury_type,
                        'record_count' => (int) $r->record_count,
                        'conversions' => (int) $r->conversions,
                        'conv_rate' => $this->safeRatePct((int) $r->conversions, (int) $r->sold),
                        'gp_margin' => $this->safeRatePct($ipl, $revenue),
                    ];
                })
                ->all();
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getAccidentSolBreakdown(): array
    {
        return $this->remember('accident_sol', function () {
            return $this->solStyleBreakdown('leads.accident_sol', 'accident_sol');
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getTreatmentTimeBreakdown(): array
    {
        return $this->remember('treatment_time', function () {
            return $this->solStyleBreakdown('leads.treatment_time', 'treatment_time');
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getPhoneVerificationBreakdown(): array
    {
        return $this->remember('phone_verification', function () {
            return $this->baseQuery($this->filters)
                ->groupBy('leads.phone_verification')
                ->selectRaw('
                    COALESCE(leads.phone_verification, \'(blank)\') as phone_verification,
                    COUNT(*) as records,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                    SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold
                ', ['returned', 'sold'])
                ->orderByDesc('records')
                ->get()
                ->map(fn ($r) => [
                    'phone_verification' => $r->phone_verification,
                    'records' => (int) $r->records,
                    'returns' => (int) $r->returns,
                    'conversions' => (int) $r->conversions,
                    'conv_rate' => $this->safeRatePct((int) $r->conversions, (int) $r->sold),
                ])
                ->all();
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getUtmSourceBreakdown(): array
    {
        return $this->remember('utm', function () {
            return $this->baseQuery($this->filters)
                ->groupBy('leads.utm_source')
                ->selectRaw('
                    COALESCE(leads.utm_source, \'(none)\') as utm_source,
                    COUNT(*) as total_leads,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                    SUM(leads.revenue) as revenue,
                    SUM(leads.cost) as cost,
                    SUM(leads.ipl) as net_profit,
                    SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions
                ', ['sold', 'returned'])
                ->orderByDesc('total_leads')
                ->get()
                ->map(function ($r) {
                    $sold = (int) $r->sold;
                    $total = (int) $r->total_leads;
                    $revenue = $this->roundMoney((float) $r->revenue);
                    $cost = $this->roundMoney((float) $r->cost);
                    $profit = $this->roundMoney((float) $r->net_profit);

                    return [
                        'utm_source' => $r->utm_source,
                        'total_leads' => $total,
                        'sold' => $sold,
                        'returns' => (int) $r->returns,
                        'return_rate' => $this->safeRatePct((int) $r->returns, $sold),
                        'revenue' => $revenue,
                        'cost' => $cost,
                        'cpl' => $this->safeDiv($cost, $total),
                        'ipl' => $this->roundMoney($sold > 0 ? $profit / $sold : 0),
                        'net_profit' => $profit,
                        'gp_margin' => $this->safeRatePct($profit, $revenue),
                        'conversions' => (int) $r->conversions,
                        'conv_rate' => $this->safeRatePct((int) $r->conversions, $sold),
                    ];
                })
                ->all();
        });
    }

    /**
     * Lead marketing source (leads.source), same shape as {@see self::getUtmSourceBreakdown()}.
     *
     * @return list<array<string, mixed>>
     */
    public function getSourceBreakdown(): array
    {
        return $this->remember('source_breakdown', function () {
            return $this->baseQuery($this->filters)
                ->groupBy('leads.source')
                ->selectRaw('
                    COALESCE(leads.source, \'(none)\') as lead_source,
                    COUNT(*) as total_leads,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                    SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                    SUM(leads.revenue) as revenue,
                    SUM(leads.cost) as cost,
                    SUM(leads.ipl) as net_profit,
                    SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions
                ', ['sold', 'returned'])
                ->orderByDesc('total_leads')
                ->get()
                ->map(function ($r) {
                    $sold = (int) $r->sold;
                    $total = (int) $r->total_leads;
                    $revenue = $this->roundMoney((float) $r->revenue);
                    $cost = $this->roundMoney((float) $r->cost);
                    $profit = $this->roundMoney((float) $r->net_profit);

                    return [
                        'lead_source' => $r->lead_source,
                        'total_leads' => $total,
                        'sold' => $sold,
                        'returns' => (int) $r->returns,
                        'return_rate' => $this->safeRatePct((int) $r->returns, $sold),
                        'revenue' => $revenue,
                        'cost' => $cost,
                        'cpl' => $this->safeDiv($cost, $total),
                        'ipl' => $this->roundMoney($sold > 0 ? $profit / $sold : 0),
                        'net_profit' => $profit,
                        'gp_margin' => $this->safeRatePct($profit, $revenue),
                        'conversions' => (int) $r->conversions,
                        'conv_rate' => $this->safeRatePct((int) $r->conversions, $sold),
                    ];
                })
                ->all();
        });
    }

    /**
     * Daily series for current range vs previous period (aligned by day index).
     *
     * @return list<array{date: string, value: float, prev_value: float}>
     */
    public function getSparklineSeries(string $metric): array
    {
        $metric = strtolower($metric);
        $allowed = ['revenue', 'net_revenue', 'cost', 'cpl', 'total_leads', 'profit', 'net_profit', 'conversions', 'sold', 'dqs'];

        if (! in_array($metric, $allowed, true)) {
            $metric = 'revenue';
        }

        return $this->remember('sparkline.'.$metric, function () use ($metric) {
            $curr = $this->dailyAggregateQuery($this->filters)->get()->keyBy('date');
            $prevF = $this->filters->previousPeriod();
            $prev = $this->dailyAggregateQuery($prevF)->get()->keyBy('date');
            $prevDates = $prev->keys()->sort()->values()->all();

            $from = Carbon::parse($this->filters->dateFrom)->startOfDay();
            $to = Carbon::parse($this->filters->dateTo)->startOfDay();

            $out = [];
            $i = 0;
            for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
                $key = $d->toDateString();
                $c = $curr->get($key);
                $value = $this->sparklineMetricValue($metric, $c);
                $prevKey = $prevDates[$i] ?? null;
                $p = $prevKey !== null ? $prev->get($prevKey) : null;
                $prevValue = $this->sparklineMetricValue($metric, $p);
                $out[] = [
                    'date' => $key,
                    'value' => $this->roundMoney($value),
                    'prev_value' => $this->roundMoney($prevValue),
                ];
                $i++;
            }

            return $out;
        });
    }

    /**
     * @return array<string, float|int>
     */
    private function aggregatePeriod(FilterRequest $f): array
    {
        $row = $this->baseQuery($f)
            ->selectRaw('
                COUNT(*) as total_leads,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as dqs,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as unsold,
                SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as fakes,
                SUM(leads.revenue) as revenue,
                SUM(CASE WHEN leads.status IN (\'sold\', \'converted\') THEN leads.revenue ELSE 0 END) as net_revenue,
                SUM(leads.cost) as cost,
                SUM(leads.ipl) as profit,
                SUM(leads.ipl) as net_profit
            ', ['returned', 'sold', 'dq', 'unsold', 'fake'])
            ->first();

        return [
            'total_leads' => (int) ($row->total_leads ?? 0),
            'returns' => (int) ($row->returns ?? 0),
            'sold' => (int) ($row->sold ?? 0),
            'dqs' => (int) ($row->dqs ?? 0),
            'unsold' => (int) ($row->unsold ?? 0),
            'conversions' => (int) ($row->conversions ?? 0),
            'fakes' => (int) ($row->fakes ?? 0),
            'revenue' => $this->roundMoney((float) ($row->revenue ?? 0)),
            'net_revenue' => $this->roundMoney((float) ($row->net_revenue ?? 0)),
            'cost' => $this->roundMoney((float) ($row->cost ?? 0)),
            'profit' => $this->roundMoney((float) ($row->profit ?? 0)),
            'net_profit' => $this->roundMoney((float) ($row->net_profit ?? 0)),
        ];
    }

    private function dailyAggregateQuery(FilterRequest $f): Builder
    {
        return $this->baseQuery($f)
            ->groupBy(DB::raw('DATE(leads.created_at)'))
            ->selectRaw('
                DATE(leads.created_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as unsold,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as dq,
                SUM(leads.revenue) as revenue,
                SUM(CASE WHEN leads.status IN (\'sold\', \'converted\') THEN leads.revenue ELSE 0 END) as net_revenue,
                SUM(leads.cost) as cost,
                SUM(leads.ipl) as profit,
                SUM(leads.ipl) as ipl,
                SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions
            ', ['sold', 'returned', 'unsold', 'dq'])
            ->orderBy('date');
    }

    private function baseQuery(FilterRequest $f): Builder
    {
        $start = Carbon::parse($f->dateFrom)->startOfDay();
        $end = Carbon::parse($f->dateTo)->endOfDay();

        $q = DB::table('leads')
            ->join('suppliers', 'leads.supplier_id', '=', 'suppliers.id')
            ->leftJoin('buyers', 'leads.buyer_id', '=', 'buyers.id')
            ->whereBetween('leads.created_at', [$start, $end]);

        if ($f->source) {
            $q->where('leads.source', $f->source);
        }
        if ($f->status) {
            $q->where('leads.status', $f->status);
        }
        if ($f->vertical) {
            $q->where('leads.vertical', $f->vertical);
        }
        if ($f->sol) {
            $q->where('leads.accident_sol', $f->sol);
        }
        if ($f->state) {
            $q->where('leads.state', $f->state);
        }
        if ($f->supplierCode) {
            $q->where('suppliers.supplier_code', $f->supplierCode);
        }
        if ($f->buyerCode) {
            $q->where('buyers.buyer_code', $f->buyerCode);
        }

        foreach ($f->customFilters as $row) {
            $field = $row['field'] ?? '';
            $value = $row['value'] ?? '';
            $scope = $row['scope'] ?? 'lead';
            if ($field === '' || $value === '') {
                continue;
            }
            if ($scope === 'fact') {
                $uid = $f->filterUserId;
                if ($uid !== null) {
                    $this->applyFactDimensionEquality($q, $field, $value, $uid);
                }

                continue;
            }

            $q->where('leads.'.$field, $value);
        }

        return $q;
    }

    /**
     * Keeps rows whose {@see Lead::$external_id} matches an integration fact owned by this user with dimensions[field]=value.
     */
    private function applyFactDimensionEquality(Builder $q, string $field, string $value, int $userId): void
    {
        $driver = DB::connection()->getDriverName();

        $q->whereExists(function ($sub) use ($field, $value, $userId, $driver) {
            $sub->select(DB::raw(1))
                ->from('integration_facts')
                ->join('integration_sources', 'integration_sources.id', '=', 'integration_facts.integration_source_id')
                ->whereColumn('integration_facts.external_id', 'leads.external_id')
                ->where('integration_sources.user_id', $userId);

            if ($driver === 'sqlite') {
                $sub->whereRaw('json_extract(integration_facts.dimensions, \'$.\' || ?) = ?', [$field, $value]);
            } else {
                $sub->whereRaw(
                    'JSON_UNQUOTE(JSON_EXTRACT(integration_facts.dimensions, CONCAT(\'$.\', JSON_QUOTE(?)))) = ?',
                    [$field, $value]
                );
            }
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function solStyleBreakdown(string $column, string $stringKey): array
    {
        $bucket = "COALESCE({$column}, '(blank)')";

        return $this->baseQuery($this->filters)
            ->selectRaw("
                {$bucket} as {$stringKey},
                SUM(CASE WHEN leads.status = 'sold' THEN 1 ELSE 0 END) as sold,
                SUM(CASE WHEN leads.status = 'returned' THEN 1 ELSE 0 END) as returns,
                SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions
            ")
            ->groupBy(DB::raw($bucket))
            ->orderByDesc('sold')
            ->get()
            ->map(fn ($r) => [
                $stringKey => $r->{$stringKey},
                'sold' => (int) $r->sold,
                'returns' => (int) $r->returns,
                'conversions' => (int) $r->conversions,
                'conv_rate' => $this->safeRatePct((int) $r->conversions, (int) $r->sold),
            ])
            ->all();
    }

    private function rollupPerformanceRow(Builder $q): object
    {
        return $q->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as sold,
                SUM(CASE WHEN leads.status = ? THEN 1 ELSE 0 END) as returns,
                SUM(leads.revenue) as revenue,
                SUM(leads.cost) as cost,
                SUM(leads.ipl) as ipl,
                SUM(CASE WHEN leads.is_conversion = 1 THEN 1 ELSE 0 END) as conversions
            ', ['sold', 'returned'])
            ->first();
    }

    private function mapPerformanceRow(
        object $r,
        ?int $id,
        string $vertical,
        bool $isGrand = false,
        ?string $buyerCode = null,
    ): array {
        $total = (int) $r->total;
        $sold = (int) $r->sold;
        $returns = (int) $r->returns;
        $revenue = $this->roundMoney((float) $r->revenue);
        $cost = $this->roundMoney((float) $r->cost);
        $ipl = $this->roundMoney((float) $r->ipl);
        $conversions = (int) $r->conversions;

        $row = [
            'buyer_id' => $id,
            'buyer_code' => $isGrand ? 'ALL' : ($buyerCode ?? ''),
            'vertical' => $vertical,
            'total' => $total,
            'sold' => $sold,
            'returns' => $returns,
            'return_rate' => $this->safeRatePct($returns, $sold),
            'revenue' => $revenue,
            'cost' => $cost,
            'cpl' => $this->safeDiv($cost, $total),
            'ipl' => $ipl,
            'net_profit' => $ipl,
            'gp_margin' => $this->safeRatePct($ipl, $revenue),
            'conversions' => $conversions,
            'conv_rate' => $this->safeRatePct($conversions, $sold),
        ];

        if ($isGrand) {
            $row['buyer_id'] = null;
            $row['vertical'] = 'ALL';
        }

        return $row;
    }

    /**
     * @param  object|null  $r  Rollup row uses synthetic supplier fields when grand.
     */
    private function mapSupplierPerformanceRow(
        object $r,
        ?int $supplierId = null,
        ?string $supplierCode = null,
        ?string $leadType = null,
        bool $isGrand = false,
    ): array {
        if (! $isGrand) {
            $supplierId = (int) $r->supplier_id;
            $supplierCode = $r->supplier_code;
            $leadType = $r->lead_type;
        }

        $total = (int) $r->total;
        $sold = (int) $r->sold;
        $returns = (int) $r->returns;
        $revenue = $this->roundMoney((float) $r->revenue);
        $cost = $this->roundMoney((float) $r->cost);
        $ipl = $this->roundMoney((float) $r->ipl);
        $conversions = (int) $r->conversions;

        return [
            'supplier_id' => $supplierId,
            'supplier_code' => $supplierCode ?? 'TOTAL',
            'lead_type' => $leadType ?? 'ALL',
            'total' => $total,
            'sold' => $sold,
            'returns' => $returns,
            'return_rate' => $this->safeRatePct($returns, $sold),
            'revenue' => $revenue,
            'cost' => $cost,
            'cpl' => $this->safeDiv($cost, $total),
            'ipl' => $ipl,
            'net_profit' => $ipl,
            'gp_margin' => $this->safeRatePct($ipl, $revenue),
            'conversions' => $conversions,
            'conv_rate' => $this->safeRatePct($conversions, $sold),
        ];
    }

    private function sparklineMetricValue(string $metric, mixed $row): float
    {
        if (! $row) {
            return 0.0;
        }

        return match ($metric) {
            'revenue' => (float) $row->revenue,
            'net_revenue' => (float) ($row->net_revenue ?? 0),
            'cost' => (float) $row->cost,
            'cpl' => $this->safeDiv((float) $row->cost, (int) ($row->total ?? 0)),
            'total_leads' => (float) $row->total,
            'profit', 'net_profit' => (float) $row->profit,
            'conversions' => (float) $row->conversions,
            'sold' => (float) $row->sold,
            'dqs' => (float) $row->dq,
            default => (float) $row->revenue,
        };
    }

    private function safeDiv(float $num, int $den): float
    {
        if ($den === 0) {
            return 0.0;
        }

        return $this->roundMoney($num / $den);
    }

    private function safeRatePct(int|float $num, int|float $den): float
    {
        if ((float) $den === 0.0) {
            return 0.0;
        }

        return $this->roundMoney((float) $num / (float) $den * 100);
    }

    private function roundMoney(float $v): float
    {
        return round($v, 2);
    }

    private function pctChange(float $curr, float $prev): float
    {
        if (abs($prev) < 1e-9) {
            return abs($curr) < 1e-9 ? 0.0 : 100.0;
        }

        return $this->roundMoney(($curr - $prev) / $prev * 100);
    }

    /**
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    private function remember(string $suffix, callable $callback): mixed
    {
        $key = 'metrics:v1:'.$suffix.':'.$this->filters->cacheKey();

        return Cache::remember($key, 60, $callback);
    }
}
