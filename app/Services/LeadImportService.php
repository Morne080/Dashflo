<?php

namespace App\Services;

use App\Jobs\VerifyIntegrationFactsForEvent;
use App\Models\IngestionEvent;
use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use Throwable;

final class LeadImportService
{
    public function __construct(
        private IntegrationJsonFactParser $parser,
        private LeadImportWebhookSettingsSync $webhookSettingsSync,
    ) {}

    public function applyExecutionTimeLimit(): void
    {
        $maxExecution = (int) config('lead_import.max_execution_time');
        if ($maxExecution === 0) {
            set_time_limit(0);
        } else {
            set_time_limit($maxExecution);
        }
    }

    /**
     * @throws InvalidArgumentException
     * @throws Throwable
     */
    public function importFromDiskPath(
        string $absolutePath,
        string $extension,
        IntegrationSource $source,
        int $bytes,
    ): LeadImportOutcome {
        $ext = strtolower($extension);
        $maxRows = (int) config('lead_import.max_rows');
        $chunkSize = (int) config('lead_import.insert_chunk_size');

        $created = 0;
        $eventId = 0;
        $importMeta = ['discovered_keys' => [], 'sample_row' => null];

        DB::transaction(function () use ($absolutePath, $ext, $source, $bytes, $maxRows, $chunkSize, &$created, &$eventId, &$importMeta): void {
            $event = IngestionEvent::query()->create([
                'integration_source_id' => $source->id,
                'direction' => IngestionEvent::DIRECTION_INBOUND_IMPORT,
                'status' => IngestionEvent::STATUS_PROCESSING,
                'bytes_received' => $bytes,
                'facts_created' => 0,
            ]);
            $eventId = $event->id;

            $importMeta = match ($ext) {
                'json' => $this->importFromJsonFile($absolutePath, $source->id, $event->id, $maxRows, $chunkSize),
                'csv', 'txt' => $this->importFromCsvFile($absolutePath, $source->id, $event->id, $maxRows, $chunkSize),
                default => throw new InvalidArgumentException('Use a .csv or .json file.'),
            };

            $created = $importMeta['created'];

            if ($created === 0) {
                throw new InvalidArgumentException('No rows found in this file.');
            }

            $event->update([
                'status' => IngestionEvent::STATUS_PROCESSED,
                'facts_created' => $created,
                'error_message' => null,
            ]);
        });

        $this->webhookSettingsSync->sync(
            $source,
            $importMeta['discovered_keys'],
            $importMeta['sample_row'],
        );

        return new LeadImportOutcome($created, $eventId);
    }

    public function dispatchVerificationAfterImport(int $created, int $eventId): void
    {
        $asyncVerificationThreshold = (int) config('lead_import.async_verification_after_facts');

        try {
            if ($created >= $asyncVerificationThreshold) {
                VerifyIntegrationFactsForEvent::dispatch($eventId);
            } else {
                VerifyIntegrationFactsForEvent::dispatchSync($eventId);
            }
        } catch (Throwable $e) {
            Log::warning('Lead verification failed after import.', [
                'ingestion_event_id' => $eventId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function successMessage(int $created): string
    {
        $asyncVerificationThreshold = (int) config('lead_import.async_verification_after_facts');
        $message = 'Imported '.$created.' lead'.($created === 1 ? '' : 's').'.';
        if ($created >= $asyncVerificationThreshold) {
            $message .= ' Lead verification is running in the background.';
        }

        return $message;
    }

    /**
     * @return array{created: int, discovered_keys: list<string>, sample_row: array<string, mixed>|null}
     */
    private function importFromJsonFile(
        string $path,
        int $sourceId,
        int $eventId,
        int $maxRows,
        int $chunkSize,
    ): array {
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            throw new InvalidArgumentException('Empty file.');
        }

        $decoded = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException('Invalid JSON: '.json_last_error_msg());
        }

        $records = $this->parser->recordsFromJson($decoded);
        if (count($records) > $maxRows) {
            throw new InvalidArgumentException('Too many rows (max '.$maxRows.'). Split the file and try again.');
        }

        $now = now()->toDateTimeString();
        $buffer = [];
        $created = 0;
        $discoveredKeySet = [];
        $firstSampleRow = null;

        foreach ($records as $r) {
            if (! is_array($r)) {
                continue;
            }
            $row = self::filterStringKeys($r);
            foreach (array_keys($row) as $key) {
                $discoveredKeySet[(string) $key] = true;
            }
            if ($firstSampleRow === null && $row !== []) {
                $firstSampleRow = $row;
            }
            $normalized = $this->parser->normalizeRow($row);
            $buffer[] = $this->makeFactInsertRow($sourceId, $eventId, $normalized, $now);
            $created++;

            if (count($buffer) >= $chunkSize) {
                IntegrationFact::query()->insert($buffer);
                $buffer = [];
            }
        }

        if ($buffer !== []) {
            IntegrationFact::query()->insert($buffer);
        }

        $keys = array_keys($discoveredKeySet);
        sort($keys);

        return [
            'created' => $created,
            'discovered_keys' => $keys,
            'sample_row' => $firstSampleRow,
        ];
    }

    /**
     * @return array{created: int, discovered_keys: list<string>, sample_row: array<string, mixed>|null}
     */
    private function importFromCsvFile(
        string $path,
        int $sourceId,
        int $eventId,
        int $maxRows,
        int $chunkSize,
    ): array {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new InvalidArgumentException('Could not read the file.');
        }

        try {
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            $header = fgetcsv($handle);
            if ($header === false || $header === []) {
                throw new InvalidArgumentException('CSV must include a header row.');
            }

            $header = array_map(static fn ($h) => trim((string) $h), $header);
            $header = array_values(array_filter($header, static fn ($h) => $h !== ''));
            if ($header === []) {
                throw new InvalidArgumentException('CSV header row is empty.');
            }

            $now = now()->toDateTimeString();
            $buffer = [];
            $created = 0;
            $firstSampleRow = null;

            while (($data = fgetcsv($handle)) !== false) {
                if ($this->csvRowIsBlank($data)) {
                    continue;
                }

                $assoc = [];
                foreach ($header as $i => $colName) {
                    $assoc[$colName] = $this->coerceCsvCell((string) ($data[$i] ?? ''));
                }

                if ($firstSampleRow === null) {
                    $firstSampleRow = $assoc;
                }

                $normalized = $this->parser->normalizeRow($assoc);
                $buffer[] = $this->makeFactInsertRow($sourceId, $eventId, $normalized, $now);
                $created++;

                if ($created > $maxRows) {
                    throw new InvalidArgumentException('Too many rows (max '.$maxRows.'). Split the file and try again.');
                }

                if (count($buffer) >= $chunkSize) {
                    IntegrationFact::query()->insert($buffer);
                    $buffer = [];
                }
            }

            if ($buffer !== []) {
                IntegrationFact::query()->insert($buffer);
            }

            $keys = $header;
            sort($keys);

            return [
                'created' => $created,
                'discovered_keys' => $keys,
                'sample_row' => $firstSampleRow,
            ];
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param  array{external_id: ?string, occurred_at: ?\Carbon\CarbonImmutable, dimensions: array<string, mixed>, measures: array<string, mixed>}  $normalized
     * @return array<string, mixed>
     */
    private function makeFactInsertRow(int $sourceId, int $eventId, array $normalized, string $timestamp): array
    {
        return [
            'integration_source_id' => $sourceId,
            'ingestion_event_id' => $eventId,
            'external_id' => $normalized['external_id'],
            'occurred_at' => $normalized['occurred_at']?->format('Y-m-d H:i:s'),
            'dimensions' => json_encode($normalized['dimensions'], JSON_THROW_ON_ERROR),
            'measures' => json_encode($normalized['measures'], JSON_THROW_ON_ERROR),
            'verifications' => null,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ];
    }

    /**
     * @param  array<int|string|null>  $data
     */
    private function csvRowIsBlank(array $data): bool
    {
        foreach ($data as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    private function coerceCsvCell(string $raw): mixed
    {
        $t = trim($raw);
        if ($t === '') {
            return '';
        }

        $lower = strtolower($t);
        if ($lower === 'true') {
            return true;
        }
        if ($lower === 'false') {
            return false;
        }

        if (is_numeric($t)) {
            return str_contains($t, '.') ? (float) $t : (int) $t;
        }

        return $t;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private static function filterStringKeys(array $row): array
    {
        $out = [];
        foreach ($row as $k => $v) {
            if (! is_string($k)) {
                continue;
            }
            $out[$k] = $v;
        }

        return $out;
    }
}
