<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreIntegrationSourceRequest;
use App\Http\Requests\UpdateIntegrationSourceRequest;
use App\Jobs\SyncRestIntegrationSource;
use App\Models\IngestionEvent;
use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use App\Support\LeadVerificationConfig;
use App\Support\WebhookEditorConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationSourceController extends Controller
{
    public function create(Request $request): Response
    {
        $this->authorize('create', IntegrationSource::class);

        return Inertia::render('Integrations/WebhookForm', [
            'mode' => 'create',
            'source' => null,
            'default_webhook' => WebhookEditorConfig::fromSettingsRoot([]),
        ]);
    }

    public function edit(Request $request, IntegrationSource $integrationSource): Response|RedirectResponse
    {
        $this->authorize('update', $integrationSource);

        if ($integrationSource->kind !== IntegrationSource::KIND_WEBHOOK) {
            return redirect()
                ->route('integrations.sources.show', $integrationSource)
                ->with('success', 'Use the API connector screen for this source.');
        }

        return Inertia::render('Integrations/WebhookForm', [
            'mode' => 'edit',
            'source' => [
                'id' => $integrationSource->id,
                'name' => $integrationSource->name,
                'enabled' => $integrationSource->enabled,
                'webhook_url' => url('/hooks/ingest/'.$integrationSource->ingest_token),
                'webhook' => $integrationSource->webhookEditorSettings(),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
            ],
        ]);
    }

    public function show(Request $request, IntegrationSource $integrationSource): Response
    {
        $this->authorize('view', $integrationSource);

        $events = $integrationSource->ingestionEvents()
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'events_page')
            ->withQueryString()
            ->through(fn (IngestionEvent $e) => [
                'id' => $e->id,
                'direction' => $e->direction,
                'status' => $e->status,
                'http_status' => $e->http_status,
                'facts_created' => $e->facts_created,
                'bytes_received' => $e->bytes_received,
                'idempotency_key' => $e->idempotency_key,
                'error_message' => $e->error_message,
                'has_payload' => $e->payload_path !== null && $e->payload_disk !== null,
                'created_at' => $e->created_at?->toIso8601String(),
            ]);

        $facts = $integrationSource->facts()
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'facts_page')
            ->withQueryString()
            ->through(fn (IntegrationFact $f) => [
                'id' => $f->id,
                'external_id' => $f->external_id,
                'occurred_at' => $f->occurred_at?->toIso8601String(),
                'dimensions' => $f->dimensions ?? [],
                'measures' => $f->measures ?? [],
                'verifications' => $f->verifications ?? null,
                'created_at' => $f->created_at?->toIso8601String(),
            ]);

        $rest = $integrationSource->restSettings();

        $owner = $integrationSource->user;

        return Inertia::render('Integrations/SourceShow', [
            'flash' => [
                'success' => $request->session()->get('success'),
            ],
            'source' => [
                'id' => $integrationSource->id,
                'name' => $integrationSource->name,
                'kind' => $integrationSource->kind,
                'enabled' => $integrationSource->enabled,
                'webhook_url' => $integrationSource->kind === IntegrationSource::KIND_WEBHOOK
                    ? url('/hooks/ingest/'.$integrationSource->ingest_token)
                    : null,
                'rest' => [
                    'base_url' => $rest['base_url'] ?? '',
                    'path' => $rest['path'] ?? '',
                ],
                'verifications' => $integrationSource->verificationSettingsForClient(),
            ],
            'account_verifications' => $owner instanceof User
                ? $owner->accountVerificationSettingsForClient()
                : LeadVerificationConfig::forClient(LeadVerificationConfig::fromSettingsRoot([])),
            'effective_verifications' => LeadVerificationConfig::forClient($integrationSource->mergedVerificationSettings()),
            'events' => $events,
            'facts' => $facts,
        ]);
    }

    /**
     * Preview stored raw payload for an ingestion event (truncated for browser safety).
     */
    public function ingestionEventPayload(Request $request, IntegrationSource $integrationSource, int $ingestion_event): JsonResponse
    {
        $this->authorize('view', $integrationSource);

        $event = IngestionEvent::query()
            ->where('id', $ingestion_event)
            ->where('integration_source_id', $integrationSource->id)
            ->firstOrFail();

        if ($event->payload_disk === null || $event->payload_path === null) {
            return response()->json([
                'content' => null,
                'truncated' => false,
                'total_bytes' => 0,
                'message' => 'No payload stored for this event.',
            ]);
        }

        $disk = Storage::disk($event->payload_disk);
        if (! $disk->exists($event->payload_path)) {
            return response()->json([
                'content' => null,
                'truncated' => false,
                'total_bytes' => 0,
                'message' => 'Payload file is missing.',
            ], 404);
        }

        $raw = $disk->get($event->payload_path);
        $totalBytes = strlen($raw);
        $max = 50_000;
        $truncated = $totalBytes > $max;
        $slice = $truncated ? substr($raw, 0, $max) : $raw;

        $decoded = json_decode($slice, true);
        $content = is_array($decoded)
            ? (string) json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            : $slice;

        return response()->json([
            'content' => $content,
            'truncated' => $truncated,
            'total_bytes' => $totalBytes,
            'message' => null,
        ]);
    }

    public function store(StoreIntegrationSourceRequest $request): RedirectResponse
    {
        $this->authorize('create', IntegrationSource::class);

        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        $settings = [];
        if ($validated['kind'] === IntegrationSource::KIND_REST_API) {
            $rest = isset($validated['rest']) && is_array($validated['rest']) ? $validated['rest'] : [];
            $settings['rest'] = [
                'base_url' => (string) ($rest['base_url'] ?? ''),
                'path' => (string) ($rest['path'] ?? ''),
                'auth_header' => (string) ($rest['auth_header'] ?? ''),
                'auth_value' => (string) ($rest['auth_value'] ?? ''),
            ];
        }

        if ($validated['kind'] === IntegrationSource::KIND_WEBHOOK) {
            $wh = $request->input('webhook', []);
            $settings['webhook'] = WebhookEditorConfig::normalizeFromRequest(is_array($wh) ? $wh : []);
        }

        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => $validated['name'],
            'kind' => $validated['kind'],
            'enabled' => (bool) ($validated['enabled'] ?? true),
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => $settings,
        ]);

        if ($validated['kind'] === IntegrationSource::KIND_WEBHOOK) {
            return redirect()
                ->route('integrations.sources.edit', $source)
                ->with('success', 'Webhook created. Copy the ingest URL and share the sample payload with your sender.');
        }

        $request->session()->flash('integrations.created_source_name', $validated['name']);

        return redirect()->route('integrations.index');
    }

    public function update(UpdateIntegrationSourceRequest $request, IntegrationSource $integrationSource): RedirectResponse
    {
        $this->authorize('update', $integrationSource);

        $validated = $request->validated();

        if (array_key_exists('name', $validated)) {
            $integrationSource->name = $validated['name'];
        }
        if (array_key_exists('enabled', $validated)) {
            $integrationSource->enabled = (bool) $validated['enabled'];
        }

        if ($integrationSource->kind === IntegrationSource::KIND_REST_API && $request->has('rest')) {
            $restInput = $request->input('rest', []);
            $current = is_array($integrationSource->settings) ? $integrationSource->settings : [];
            $rest = is_array($current['rest'] ?? null) ? $current['rest'] : [];
            if (isset($restInput['base_url'])) {
                $rest['base_url'] = (string) $restInput['base_url'];
            }
            if (array_key_exists('path', $restInput)) {
                $rest['path'] = (string) $restInput['path'];
            }
            if (array_key_exists('auth_header', $restInput)) {
                $rest['auth_header'] = (string) $restInput['auth_header'];
            }
            if (array_key_exists('auth_value', $restInput) && $restInput['auth_value'] !== null && $restInput['auth_value'] !== '') {
                $rest['auth_value'] = (string) $restInput['auth_value'];
            }
            $current['rest'] = $rest;
            $integrationSource->settings = $current;
        }

        $redirectToWebhookEditor = false;
        if ($integrationSource->kind === IntegrationSource::KIND_WEBHOOK && array_key_exists('webhook', $validated)) {
            $current = is_array($integrationSource->settings) ? $integrationSource->settings : [];
            $whIn = $validated['webhook'];
            $current['webhook'] = WebhookEditorConfig::normalizeFromRequest(is_array($whIn) ? $whIn : []);
            $integrationSource->settings = $current;
            $redirectToWebhookEditor = true;
        }

        $redirectToSourceShow = false;
        if (array_key_exists('verifications', $validated)) {
            $current = is_array($integrationSource->settings) ? $integrationSource->settings : [];
            $existing = $integrationSource->rawSourceVerificationSettings();
            $vIn = $validated['verifications'];
            if (! is_array($vIn)) {
                $vIn = [];
            }

            $inherit = $integrationSource->verificationInheritsAccountDefaults();
            if (array_key_exists('inherit_account_defaults', $vIn)) {
                $inherit = (bool) $vIn['inherit_account_defaults'];
            }

            $twilio = $existing['twilio_lookup'];
            if (isset($vIn['twilio_lookup']) && is_array($vIn['twilio_lookup'])) {
                $tIn = $vIn['twilio_lookup'];
                if (array_key_exists('enabled', $tIn)) {
                    $twilio['enabled'] = (bool) $tIn['enabled'];
                }
                if (array_key_exists('account_sid', $tIn)) {
                    $twilio['account_sid'] = (string) $tIn['account_sid'];
                }
                if (isset($tIn['auth_token']) && is_string($tIn['auth_token']) && $tIn['auth_token'] !== '') {
                    $twilio['auth_token'] = $tIn['auth_token'];
                }
            }

            $email = $existing['email_verification'];
            if (isset($vIn['email_verification']) && is_array($vIn['email_verification'])) {
                $eIn = $vIn['email_verification'];
                if (array_key_exists('enabled', $eIn)) {
                    $email['enabled'] = (bool) $eIn['enabled'];
                }
            }

            $tf = $existing['trustedform'];
            if (isset($vIn['trustedform']) && is_array($vIn['trustedform'])) {
                $tfIn = $vIn['trustedform'];
                if (array_key_exists('enabled', $tfIn)) {
                    $tf['enabled'] = (bool) $tfIn['enabled'];
                }
                if (isset($tfIn['api_key']) && is_string($tfIn['api_key']) && $tfIn['api_key'] !== '') {
                    $tf['api_key'] = $tfIn['api_key'];
                }
            }

            $current['verifications'] = [
                'inherit_account_defaults' => $inherit,
                'twilio_lookup' => $twilio,
                'email_verification' => $email,
                'trustedform' => $tf,
            ];
            $integrationSource->settings = $current;
            $redirectToSourceShow = true;
        }

        $integrationSource->save();

        if ($redirectToSourceShow) {
            return redirect()
                ->route('integrations.sources.show', $integrationSource)
                ->with('success', 'Verification settings saved.');
        }

        if ($redirectToWebhookEditor) {
            return redirect()
                ->route('integrations.sources.edit', $integrationSource)
                ->with('success', 'Webhook saved.');
        }

        return redirect()->route('integrations.index')->with('success', 'Source updated.');
    }

    public function destroy(Request $request, IntegrationSource $integrationSource): RedirectResponse
    {
        $this->authorize('delete', $integrationSource);

        $integrationSource->delete();

        return redirect()->route('integrations.index')->with('success', 'Source removed.');
    }

    public function sync(Request $request, IntegrationSource $integrationSource): RedirectResponse
    {
        $this->authorize('update', $integrationSource);

        if ($integrationSource->kind !== IntegrationSource::KIND_REST_API) {
            return redirect()->route('integrations.index')->with('error', 'Only API connectors can be synced.');
        }

        SyncRestIntegrationSource::dispatch($integrationSource->id);

        return redirect()->route('integrations.index')->with('success', 'Sync started. Refresh in a few seconds to see new activity.');
    }
}
