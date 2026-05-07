<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessIngestionEvent;
use App\Models\IngestionEvent;
use App\Models\IntegrationSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class WebhookIngestController extends Controller
{
    /**
     * Inbound webhook (no session auth). Secured by unguessable URL token only.
     */
    public function store(Request $request, string $token): JsonResponse|HttpResponse
    {
        $source = IntegrationSource::query()
            ->where('ingest_token', $token)
            ->where('kind', IntegrationSource::KIND_WEBHOOK)
            ->where('enabled', true)
            ->first();

        if ($source === null) {
            return response()->json(['message' => 'Not found.'], SymfonyResponse::HTTP_NOT_FOUND);
        }

        $raw = $request->getContent();

        $disk = config('filesystems.default', 'local');
        $event = IngestionEvent::query()->create([
            'integration_source_id' => $source->id,
            'direction' => IngestionEvent::DIRECTION_INBOUND_WEBHOOK,
            'status' => IngestionEvent::STATUS_RECEIVED,
            'idempotency_key' => null,
            'http_status' => SymfonyResponse::HTTP_OK,
            'error_message' => null,
            'payload_disk' => null,
            'payload_path' => null,
            'bytes_received' => strlen($raw),
            'facts_created' => 0,
        ]);

        $relativePath = 'integration-payloads/'.$event->id.'.json';
        Storage::disk($disk)->put($relativePath, $raw === '' ? '{}' : $raw);

        $event->update([
            'payload_disk' => $disk,
            'payload_path' => $relativePath,
        ]);

        // Run inline so facts exist without a queue worker (default QUEUE_CONNECTION is often "database").
        ProcessIngestionEvent::dispatchSync($event->id);

        $resp = $source->webhookIngestResponse();
        if ($resp['mode'] === 'plain') {
            return response(
                $resp['plain_body'],
                SymfonyResponse::HTTP_ACCEPTED,
                ['Content-Type' => 'text/plain; charset=UTF-8'],
            );
        }

        return response()->json([
            'message' => $resp['json_message'],
            'ingestion_event_id' => $event->id,
        ], SymfonyResponse::HTTP_ACCEPTED);
    }
}
