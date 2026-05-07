<?php

namespace App\Jobs;

use App\Models\IngestionEvent;
use App\Models\IntegrationFact;
use App\Services\IntegrationJsonFactParser;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProcessIngestionEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $ingestionEventId,
    ) {}

    public function handle(IntegrationJsonFactParser $parser): void
    {
        $event = IngestionEvent::query()->find($this->ingestionEventId);
        if ($event === null) {
            return;
        }

        $event->update(['status' => IngestionEvent::STATUS_PROCESSING]);

        try {
            if ($event->payload_disk === null || $event->payload_path === null) {
                throw new \RuntimeException('Missing payload reference.');
            }

            $raw = Storage::disk($event->payload_disk)->get($event->payload_path);
            $decoded = json_decode($raw, true);
            if ($raw !== '' && $raw !== 'null' && json_last_error() !== JSON_ERROR_NONE) {
                throw new \RuntimeException('Invalid JSON: '.json_last_error_msg());
            }

            $rows = $parser->recordsFromJson($decoded);
            $created = 0;

            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $normalized = $parser->normalizeRow($row);
                IntegrationFact::query()->create([
                    'integration_source_id' => $event->integration_source_id,
                    'ingestion_event_id' => $event->id,
                    'external_id' => $normalized['external_id'],
                    'occurred_at' => $normalized['occurred_at'],
                    'dimensions' => $normalized['dimensions'],
                    'measures' => $normalized['measures'],
                ]);
                $created++;
            }

            $event->update([
                'status' => IngestionEvent::STATUS_PROCESSED,
                'facts_created' => $created,
                'error_message' => null,
            ]);

            if ($created > 0) {
                try {
                    VerifyIntegrationFactsForEvent::dispatchSync($event->id);
                } catch (Throwable $e) {
                    Log::warning('Lead verification failed after ingest.', [
                        'ingestion_event_id' => $event->id,
                        'message' => $e->getMessage(),
                    ]);
                }
            }
        } catch (Throwable $e) {
            $event->update([
                'status' => IngestionEvent::STATUS_FAILED,
                'error_message' => $e->getMessage(),
            ]);
        }
    }
}
