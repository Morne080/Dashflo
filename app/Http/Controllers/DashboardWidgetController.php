<?php

namespace App\Http\Controllers;

use App\DTO\FilterRequest;
use App\Http\Requests\SyncDashboardWidgetsRequest;
use App\Models\Dashboard;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class DashboardWidgetController extends Controller
{
    /**
     * Full replace of widgets for a dashboard (layout + metadata).
     */
    public function sync(SyncDashboardWidgetsRequest $request, Dashboard $dashboard): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($dashboard->isEditableBy($user), 403);

        $validated = $request->validated();
        $rows = $validated['widgets'];

        $keptIds = collect($rows)
            ->pluck('id')
            ->filter(fn ($id) => $id !== null && $id !== '')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        DB::transaction(function () use ($dashboard, $rows, $keptIds, $validated, $user): void {
            if ($keptIds->isEmpty()) {
                $dashboard->widgets()->delete();
            } else {
                $dashboard->widgets()->whereNotIn('id', $keptIds->all())->delete();
            }

            foreach ($rows as $index => $row) {
                $payload = [
                    'widget_type' => $row['widget_type'],
                    'metric_key' => (string) ($row['metric_key'] ?? ''),
                    'title' => $row['title'] ?? null,
                    'config_json' => $row['config_json'] ?? [],
                    'filters_json' => $row['filters_json'] ?? [],
                    'layout_x' => (int) $row['layout_x'],
                    'layout_y' => (int) $row['layout_y'],
                    'layout_w' => (int) $row['layout_w'],
                    'layout_h' => (int) $row['layout_h'],
                    'sort_order' => $index,
                ];

                if (! empty($row['id'])) {
                    $dashboard->widgets()
                        ->whereKey((int) $row['id'])
                        ->update($payload);
                } else {
                    $dashboard->widgets()->create($payload);
                }
            }

            if (isset($validated['filters'])) {
                $fr = FilterRequest::fromDashboardFilters($validated['filters'], $user, $user->id);
                $dashboard->filters_json = $fr->toResponseArray();
                $dashboard->save();
            }
        });

        return redirect()->route('dashboards.show', $dashboard);
    }
}
