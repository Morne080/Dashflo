<?php

namespace App\Jobs;

use App\Models\IngestionEvent;
use App\Models\IntegrationSource;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Throwable;

class SyncRestIntegrationSource implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $integrationSourceId,
    ) {}

    public function handle(): void
    {
        $source = IntegrationSource::query()->find($this->integrationSourceId);
        if ($source === null || $source->kind !== IntegrationSource::KIND_REST_API || ! $source->enabled) {
            return;
        }

        $rest = $source->restSettings();
        $baseUrl = isset($rest['base_url']) && is_string($rest['base_url']) ? rtrim($rest['base_url'], '/') : '';
        $path = isset($rest['path']) && is_string($rest['path']) ? '/'.ltrim($rest['path'], '/') : '';
        if ($baseUrl === '') {
            return;
        }

        $url = $baseUrl.$path;
        $headers = [];
        if (! empty($rest['auth_header']) && is_string($rest['auth_header']) && isset($rest['auth_value']) && is_string($rest['auth_value'])) {
            $headers[$rest['auth_header']] = $rest['auth_value'];
        }

        $event = IngestionEvent::query()->create([
            'integration_source_id' => $source->id,
            'direction' => IngestionEvent::DIRECTION_OUTBOUND_PULL,
            'status' => IngestionEvent::STATUS_RECEIVED,
            'idempotency_key' => null,
            'http_status' => null,
            'error_message' => null,
            'payload_disk' => null,
            'payload_path' => null,
            'bytes_received' => 0,
            'facts_created' => 0,
        ]);

        try {
            $response = Http::timeout(30)
                ->withHeaders($headers)
                ->acceptJson()
                ->get($url);

            $body = $response->body();
            $disk = config('filesystems.default', 'local');
            $relativePath = 'integration-payloads/'.$event->id.'.json';
            Storage::disk($disk)->put($relativePath, $body);

            $event->update([
                'http_status' => $response->status(),
                'payload_disk' => $disk,
                'payload_path' => $relativePath,
                'bytes_received' => strlen($body),
                'error_message' => $response->successful() ? null : 'HTTP '.$response->status(),
            ]);

            if ($response->successful()) {
                ProcessIngestionEvent::dispatchSync($event->id);
            } else {
                $event->update(['status' => IngestionEvent::STATUS_FAILED]);
            }
        } catch (Throwable $e) {
            $event->update([
                'status' => IngestionEvent::STATUS_FAILED,
                'error_message' => $e->getMessage(),
            ]);
        }
    }
}
