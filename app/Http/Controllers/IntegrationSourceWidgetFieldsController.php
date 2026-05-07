<?php

namespace App\Http\Controllers;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationSourceWidgetFieldsController extends Controller
{
    /**
     * Suggested dimension / measure keys from recent facts (for dashboard widget builder).
     */
    public function __invoke(Request $request, IntegrationSource $integrationSource): JsonResponse
    {
        $this->authorize('view', $integrationSource);

        $facts = IntegrationFact::query()
            ->where('integration_source_id', $integrationSource->id)
            ->orderByDesc('id')
            ->limit(300)
            ->get(['dimensions', 'measures']);

        $dimKeys = [];
        $measKeys = [];
        foreach ($facts as $f) {
            if (is_array($f->dimensions)) {
                foreach (array_keys($f->dimensions) as $k) {
                    $dimKeys[(string) $k] = true;
                }
            }
            if (is_array($f->measures)) {
                foreach (array_keys($f->measures) as $k) {
                    $measKeys[(string) $k] = true;
                }
            }
        }

        $dimensionKeys = array_keys($dimKeys);
        $measureKeys = array_keys($measKeys);
        sort($dimensionKeys);
        sort($measureKeys);

        return response()->json([
            'dimension_keys' => $dimensionKeys,
            'measure_keys' => $measureKeys,
            'fact_fields' => [
                ['path' => 'id', 'label' => 'Fact ID'],
                ['path' => 'external_id', 'label' => 'External ID'],
                ['path' => 'occurred_at', 'label' => 'Occurred at'],
                ['path' => 'created_at', 'label' => 'Imported at'],
            ],
        ]);
    }
}
