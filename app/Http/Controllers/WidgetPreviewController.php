<?php

namespace App\Http\Controllers;

use App\Http\Requests\WidgetPreviewRequest;
use App\Services\DashboardWidgetPayloadBuilder;
use Illuminate\Http\JsonResponse;

class WidgetPreviewController extends Controller
{
    public function __construct(
        private readonly DashboardWidgetPayloadBuilder $widgetPayloadBuilder,
    ) {}

    /**
     * Live widget payload for the configuration modal (matches `widgets[]` Inertia items).
     */
    public function show(WidgetPreviewRequest $request): JsonResponse
    {
        $widget = $request->validated('widget');

        $preview = $this->widgetPayloadBuilder->previewPayload($request, $widget);

        return response()->json(['preview' => $preview]);
    }
}
