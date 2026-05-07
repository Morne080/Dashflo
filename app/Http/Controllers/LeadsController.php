<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateIntegrationFactRequest;
use App\Leads\LeadDetailPresenter;
use App\Leads\LeadRowPresenter;
use App\Models\IngestionEvent;
use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class LeadsController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'tab' => 'sometimes|in:leads,requests,import',
            'source_id' => 'nullable|integer|exists:integration_sources,id',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'q' => 'nullable|string|max:200',
            'leads_page' => 'nullable|integer|min:1',
            'requests_page' => 'nullable|integer|min:1',
        ]);

        $tab = $validated['tab'] ?? 'leads';

        $sourceId = isset($validated['source_id'])
            ? (int) $validated['source_id']
            : null;

        if ($sourceId !== null) {
            $ownsSource = IntegrationSource::query()
                ->forUser($user)
                ->whereKey($sourceId)
                ->exists();
            if (! $ownsSource) {
                abort(404);
            }
        }

        $sources = IntegrationSource::query()
            ->forUser($user)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (IntegrationSource $s) => [
                'id' => $s->id,
                'name' => $s->name,
            ]);

        $filters = [
            'tab' => $tab,
            'source_id' => $sourceId,
            'from' => $validated['from'] ?? null,
            'to' => $validated['to'] ?? null,
            'q' => $validated['q'] ?? null,
        ];

        $flash = [
            'success' => $request->session()->get('success'),
        ];

        $ownedSourceIds = IntegrationSource::query()
            ->forUser($user)
            ->pluck('id');

        if ($tab === 'import') {
            return Inertia::render('Leads/Index', [
                'tab' => 'import',
                'sources' => $sources,
                'filters' => $filters,
                'leads' => null,
                'requests' => null,
                'flash' => $flash,
                'leadImport' => [
                    'chunkedThresholdKb' => (int) config('lead_import.chunked_upload_threshold_kb'),
                    'chunkUploadKb' => (int) config('lead_import.chunk_upload_kb'),
                    'maxRows' => (int) config('lead_import.max_rows'),
                    'maxUploadMb' => (int) floor((int) config('lead_import.max_upload_kb') / 1024),
                ],
            ]);
        }

        if ($tab === 'requests') {
            $requestsQuery = IngestionEvent::query()
                ->whereIn('integration_source_id', $ownedSourceIds)
                ->with('integrationSource:id,name')
                ->orderByDesc('id');

            if ($sourceId !== null) {
                $requestsQuery->where('integration_source_id', $sourceId);
            }
            if (! empty($validated['from'])) {
                $requestsQuery->where('created_at', '>=', $validated['from'].' 00:00:00');
            }
            if (! empty($validated['to'])) {
                $requestsQuery->where('created_at', '<=', $validated['to'].' 23:59:59');
            }
            if (! empty($validated['q'])) {
                $needle = '%'.addcslashes((string) $validated['q'], '%_\\').'%';
                $requestsQuery->where(function ($q) use ($needle) {
                    $q->where('error_message', 'like', $needle)
                        ->orWhere('direction', 'like', $needle)
                        ->orWhere('status', 'like', $needle)
                        ->orWhereRaw('CAST(id AS CHAR) LIKE ?', [$needle]);
                });
            }

            $requests = $requestsQuery
                ->paginate(25, ['*'], 'requests_page')
                ->withQueryString()
                ->through(fn (IngestionEvent $e) => [
                    'id' => $e->id,
                    'source_id' => $e->integration_source_id,
                    'source_name' => $e->integrationSource?->name,
                    'created_at' => $e->created_at?->toIso8601String(),
                    'direction' => $e->direction,
                    'status' => $e->status,
                    'http_status' => $e->http_status,
                    'facts_created' => $e->facts_created,
                    'bytes_received' => $e->bytes_received,
                    'error_message' => $e->error_message,
                    'has_payload' => $e->payload_path !== null && $e->payload_disk !== null,
                ]);

            return Inertia::render('Leads/Index', [
                'tab' => 'requests',
                'sources' => $sources,
                'filters' => $filters,
                'leads' => null,
                'requests' => $requests,
                'flash' => $flash,
            ]);
        }

        $leadsQuery = IntegrationFact::query()
            ->whereIn('integration_source_id', $ownedSourceIds)
            ->with([
                'integrationSource:id,name',
                'ingestionEvent:id,created_at,status',
            ])
            ->orderByDesc('id');

        if ($sourceId !== null) {
            $leadsQuery->where('integration_source_id', $sourceId);
        }
        if (! empty($validated['from'])) {
            $leadsQuery->where('created_at', '>=', $validated['from'].' 00:00:00');
        }
        if (! empty($validated['to'])) {
            $leadsQuery->where('created_at', '<=', $validated['to'].' 23:59:59');
        }
        if (! empty($validated['q'])) {
            $needle = '%'.addcslashes((string) $validated['q'], '%_\\').'%';
            $leadsQuery->where(function ($q) use ($needle) {
                $q->where('external_id', 'like', $needle)
                    ->orWhereRaw('CAST(dimensions AS CHAR) LIKE ?', [$needle])
                    ->orWhereRaw('CAST(measures AS CHAR) LIKE ?', [$needle]);
            });
        }

        $leads = $leadsQuery
            ->paginate(25, ['*'], 'leads_page')
            ->withQueryString()
            ->through(fn (IntegrationFact $f) => LeadRowPresenter::fromFact($f));

        return Inertia::render('Leads/Index', [
            'tab' => 'leads',
            'sources' => $sources,
            'filters' => $filters,
            'leads' => $leads,
            'requests' => null,
            'flash' => $flash,
        ]);
    }

    public function show(Request $request, IntegrationFact $integrationFact): Response
    {
        $this->authorize('view', $integrationFact);

        $integrationFact->load([
            'integrationSource:id,user_id,name,kind,ingest_token,settings',
            'ingestionEvent:id,integration_source_id,created_at,status,direction,payload_disk,payload_path,bytes_received',
        ]);

        $source = $integrationFact->integrationSource;
        if ($source === null) {
            abort(404);
        }

        $rest = $source->restSettings();
        $endpointLabel = $source->kind === IntegrationSource::KIND_WEBHOOK
            ? 'Webhook POST'
            : 'REST API GET';
        $endpointValue = $source->kind === IntegrationSource::KIND_WEBHOOK
            ? url('/hooks/ingest/'.$source->ingest_token)
            : trim((string) ($rest['base_url'] ?? '')).trim((string) ($rest['path'] ?? ''));

        $summary = LeadRowPresenter::fromFact($integrationFact);

        return Inertia::render('Leads/Show', [
            'flash' => [
                'success' => $request->session()->get('success'),
            ],
            'lead' => [
                'id' => $integrationFact->id,
                'external_id' => $integrationFact->external_id,
                'record_summary' => $summary['record_summary'],
                'campaign' => $summary['campaign'],
                'supplier' => $summary['supplier'],
                'platform' => $summary['platform'],
                'received_at' => $summary['received_at'],
                'created_at' => $integrationFact->created_at?->toIso8601String(),
                'delivery_status' => $summary['delivery_status'],
                'ingestion_event_id' => $integrationFact->ingestion_event_id,
                'verifications' => $integrationFact->verifications,
                'source' => [
                    'id' => $source->id,
                    'name' => $source->name,
                    'kind' => $source->kind,
                ],
            ],
            'standard_fields' => LeadDetailPresenter::standardFieldRows($integrationFact),
            'custom_fields' => LeadDetailPresenter::customFieldRows($integrationFact),
            'originating' => [
                'endpoint_label' => $endpointLabel,
                'endpoint_value' => $endpointValue !== '' ? $endpointValue : '—',
                'connector_label' => 'Integration',
                'connector_name' => $source->name,
                'connector_href' => route('integrations.index'),
            ],
            'payload' => $this->payloadForLeadDetail($integrationFact->ingestionEvent),
        ]);
    }

    public function update(UpdateIntegrationFactRequest $request, IntegrationFact $integrationFact): RedirectResponse
    {
        $this->authorize('update', $integrationFact);

        $dims = is_array($integrationFact->dimensions) ? $integrationFact->dimensions : [];
        $meas = is_array($integrationFact->measures) ? $integrationFact->measures : [];

        foreach ($request->validated('fields') as $row) {
            $bag = $row['bag'];
            $key = $row['key'];
            $raw = (string) ($row['value'] ?? '');

            if ($bag === 'dimensions') {
                if (trim($raw) === '') {
                    unset($dims[$key]);
                } else {
                    $dims[$key] = self::coerceDimensionValue($raw);
                }
            } elseif (trim($raw) === '') {
                unset($meas[$key]);
            } else {
                $meas[$key] = self::coerceMeasureValue($raw);
            }
        }

        $integrationFact->dimensions = $dims;
        $integrationFact->measures = $meas;
        $integrationFact->save();

        return redirect()
            ->route('leads.show', $integrationFact)
            ->with('success', 'Lead details saved.');
    }

    private static function coerceMeasureValue(string $raw): mixed
    {
        $t = trim($raw);
        if ($t === '') {
            return '';
        }
        $lower = strtolower($t);
        if (in_array($lower, ['true', 'yes', '1'], true)) {
            return true;
        }
        if (in_array($lower, ['false', 'no', '0'], true)) {
            return false;
        }
        if (is_numeric($t)) {
            return str_contains($t, '.') ? (float) $t : (int) $t;
        }

        return $t;
    }

    private static function coerceDimensionValue(string $raw): mixed
    {
        $t = trim($raw);
        if ($t === '') {
            return '';
        }
        if (str_starts_with($t, '[') || str_starts_with($t, '{')) {
            $decoded = json_decode($t, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }
        $lower = strtolower($t);
        if (in_array($lower, ['true', 'yes'], true)) {
            return true;
        }
        if (in_array($lower, ['false', 'no'], true)) {
            return false;
        }
        if (is_numeric($t)) {
            return str_contains($t, '.') ? (float) $t : (int) $t;
        }

        return $t;
    }

    /**
     * @return array{content: string|null, truncated: bool, total_bytes: int, message: string|null}
     */
    private function payloadForLeadDetail(?IngestionEvent $event): array
    {
        if ($event === null || $event->payload_disk === null || $event->payload_path === null) {
            return [
                'content' => null,
                'truncated' => false,
                'total_bytes' => 0,
                'message' => 'No originating request payload is stored for this lead.',
            ];
        }

        $disk = Storage::disk($event->payload_disk);
        if (! $disk->exists($event->payload_path)) {
            return [
                'content' => null,
                'truncated' => false,
                'total_bytes' => 0,
                'message' => 'Payload file is missing from storage.',
            ];
        }

        $raw = $disk->get($event->payload_path);
        $totalBytes = strlen($raw);
        $max = 120_000;
        $truncated = $totalBytes > $max;
        $slice = $truncated ? substr($raw, 0, $max) : $raw;

        $decoded = json_decode($slice, true);
        $content = is_array($decoded)
            ? (string) json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            : $slice;

        return [
            'content' => $content,
            'truncated' => $truncated,
            'total_bytes' => $totalBytes,
            'message' => null,
        ];
    }
}
