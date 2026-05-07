<?php

namespace App\Http\Controllers;

use App\DTO\FilterRequest;
use App\Services\MetricsService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardExportController extends Controller
{
    /** @var list<string> */
    private const TABLES = [
        'daily_metrics',
        'buyers_performance',
        'suppliers_performance',
        'states_performance',
        'disposition_report',
        'injury_type',
        'accident_date',
        'treatment_time',
        'phone_verification',
        'utm_source',
        'source_breakdown',
    ];

    public function export(Request $request, string $table): StreamedResponse
    {
        if (! in_array($table, self::TABLES, true)) {
            abort(404);
        }

        $filters = FilterRequest::fromRequest($request);
        $metrics = new MetricsService($filters);

        $rows = match ($table) {
            'daily_metrics' => $metrics->getDailyMetrics(),
            'buyers_performance' => $metrics->getBuyerPerformance(),
            'suppliers_performance' => $metrics->getSupplierPerformance(),
            'states_performance' => $metrics->getStatePerformance(),
            'disposition_report' => $metrics->getDispositionBreakdown(),
            'injury_type' => $metrics->getInjuryTypeBreakdown(),
            'accident_date' => $metrics->getAccidentSolBreakdown(),
            'treatment_time' => $metrics->getTreatmentTimeBreakdown(),
            'phone_verification' => $metrics->getPhoneVerificationBreakdown(),
            'utm_source' => $metrics->getUtmSourceBreakdown(),
            'source_breakdown' => $metrics->getSourceBreakdown(),
        };

        $filename = $table.'_'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');

            if ($rows === []) {
                fputcsv($out, ['message']);
                fputcsv($out, ['No data for selected filters']);
                fclose($out);

                return;
            }

            $headers = array_keys($rows[0]);
            fputcsv($out, $headers);

            foreach ($rows as $row) {
                $line = [];
                foreach ($headers as $key) {
                    $v = $row[$key] ?? '';
                    if (is_bool($v)) {
                        $line[] = $v ? '1' : '0';
                    } elseif (is_int($v) || is_float($v)) {
                        $line[] = $v;
                    } elseif ($v === null) {
                        $line[] = '';
                    } else {
                        $line[] = (string) $v;
                    }
                }
                fputcsv($out, $line);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
