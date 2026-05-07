<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\User;
use App\Support\LeadCustomFilters;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Distinct values for dashboard filter builder (column picklists), optionally scoped by traffic {@see Lead::$source}.
 */
final class DashboardFilterColumnValuesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'column' => ['required', 'string', 'max:64'],
            'traffic_source' => ['nullable', 'string', 'max:255'],
        ]);

        $column = $validated['column'];
        $trafficSource = $validated['traffic_source'] ?? null;
        if ($trafficSource === '') {
            $trafficSource = null;
        }

        if (! LeadCustomFilters::isKnownCatalogFieldForUser($user, $column)) {
            abort(422, 'Unknown column.');
        }

        if (LeadCustomFilters::isAllowedLeadColumn($column)) {
            return response()->json([
                'values' => LeadCustomFilters::distinctLeadColumnValuesScoped($trafficSource, $column),
            ]);
        }

        return response()->json([
            'values' => LeadCustomFilters::distinctFactDimensionValuesScopedForUser($user, $column, $trafficSource),
        ]);
    }
}
