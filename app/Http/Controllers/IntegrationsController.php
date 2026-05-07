<?php

namespace App\Http\Controllers;

use App\Models\IngestionEvent;
use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationsController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $sources = IntegrationSource::query()
            ->forUser($user)
            ->with(['user:id,name'])
            ->withCount('facts')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (IntegrationSource $s) => $this->serializeSource($s));

        $recentEvents = IngestionEvent::query()
            ->whereIn('integration_source_id', $sources->pluck('id'))
            ->with('integrationSource:id,name,kind')
            ->orderByDesc('id')
            ->limit(40)
            ->get()
            ->map(fn (IngestionEvent $e) => [
                'id' => $e->id,
                'source_id' => $e->integration_source_id,
                'source_name' => $e->integrationSource?->name,
                'source_kind' => $e->integrationSource?->kind,
                'direction' => $e->direction,
                'status' => $e->status,
                'http_status' => $e->http_status,
                'facts_created' => $e->facts_created,
                'bytes_received' => $e->bytes_received,
                'error_message' => $e->error_message,
                'created_at' => $e->created_at?->toIso8601String(),
            ]);

        $factsCount = IntegrationFact::query()
            ->whereHas('integrationSource', fn ($q) => $q->where('user_id', $user->id))
            ->count();

        $recentFacts = IntegrationFact::query()
            ->whereHas('integrationSource', fn ($q) => $q->where('user_id', $user->id))
            ->with('integrationSource:id,name')
            ->orderByDesc('id')
            ->paginate(25, ['*'], 'facts_page')
            ->withQueryString()
            ->through(fn (IntegrationFact $f) => [
                'id' => $f->id,
                'source_id' => $f->integration_source_id,
                'source_name' => $f->integrationSource?->name,
                'external_id' => $f->external_id,
                'occurred_at' => $f->occurred_at?->toIso8601String(),
                'dimensions' => $f->dimensions ?? [],
                'measures' => $f->measures ?? [],
                'created_at' => $f->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Integrations/Index', [
            'sources' => $sources,
            'recentEvents' => $recentEvents,
            'recentFacts' => $recentFacts,
            'factsCount' => $factsCount,
            'flash' => [
                'created_source_name' => $request->session()->get('integrations.created_source_name'),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeSource(IntegrationSource $s): array
    {
        $rest = $s->restSettings();
        $merged = $s->mergedVerificationSettings();
        $checks = [];
        if ($merged['twilio_lookup']['enabled']) {
            $checks[] = 'Phone';
        }
        if ($merged['email_verification']['enabled']) {
            $checks[] = 'Email';
        }
        if ($merged['trustedform']['enabled']) {
            $checks[] = 'TrustedForm';
        }
        $verificationSummary = $checks === [] ? '—' : implode(' · ', $checks);

        return [
            'id' => $s->id,
            'name' => $s->name,
            'kind' => $s->kind,
            'enabled' => $s->enabled,
            'ingest_token' => $s->ingest_token,
            'webhook_url' => url('/hooks/ingest/'.$s->ingest_token),
            'rest' => [
                'base_url' => $rest['base_url'] ?? '',
                'path' => $rest['path'] ?? '',
                'auth_header' => $rest['auth_header'] ?? '',
                'auth_value_set' => isset($rest['auth_value']) && is_string($rest['auth_value']) && $rest['auth_value'] !== '',
            ],
            'facts_count' => (int) ($s->facts_count ?? 0),
            'last_event_at' => null,
            'created_at' => $s->created_at?->toIso8601String(),
            'created_by_name' => $s->user?->name ?? '—',
            'verification_summary' => $verificationSummary,
            'inherits_workspace_verification' => $s->verificationInheritsAccountDefaults(),
        ];
    }
}
