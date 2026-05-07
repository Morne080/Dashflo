<?php

namespace Tests\Feature;

use App\Models\IngestionEvent;
use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LeadsShowTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_view_lead_detail_with_payload(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'CRM',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $path = 'integration-payloads/lead-show-1.json';
        Storage::disk('local')->put($path, json_encode(['campid' => 'LEGAL-MVA-USA', 'email' => 'a@b.com']));

        $event = IngestionEvent::query()->create([
            'integration_source_id' => $source->id,
            'direction' => IngestionEvent::DIRECTION_INBOUND_WEBHOOK,
            'status' => IngestionEvent::STATUS_PROCESSED,
            'payload_disk' => 'local',
            'payload_path' => $path,
            'bytes_received' => 50,
            'facts_created' => 1,
        ]);

        $fact = IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => $event->id,
            'external_id' => 'ext-1',
            'occurred_at' => null,
            'dimensions' => ['firstname' => 'Vincent', 'lastname' => 'McIntosh', 'accident_state' => 'AL'],
            'measures' => ['score' => 1],
        ]);

        $this->actingAs($user)
            ->get(route('leads.show', $fact))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Leads/Show')
                ->has('flash')
                ->where('lead.id', $fact->id)
                ->has('standard_fields')
                ->has('custom_fields')
                ->where('payload.truncated', false)
                ->where('payload.total_bytes', strlen((string) Storage::disk('local')->get($path))));
    }

    public function test_other_user_cannot_view_lead(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $owner->id,
            'name' => 'CRM',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $fact = IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'x',
            'occurred_at' => null,
            'dimensions' => [],
            'measures' => [],
        ]);

        $this->actingAs($intruder)
            ->get(route('leads.show', $fact))
            ->assertNotFound();
    }
}
