<?php

namespace Tests\Feature;

use App\Models\IngestionEvent;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class IntegrationSourceDataViewerTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_view_source_data_page(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $this->actingAs($user)
            ->get(route('integrations.sources.show', $source))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Integrations/SourceShow')
                ->has('source')
                ->has('account_verifications')
                ->has('effective_verifications')
                ->where('source.name', 'Hook'));
    }

    public function test_other_user_cannot_view_source_data_page(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $owner->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $this->actingAs($intruder)
            ->get(route('integrations.sources.show', $source))
            ->assertNotFound();
    }

    public function test_owner_can_fetch_truncated_payload_json(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $path = 'integration-payloads/test-1.json';
        Storage::disk('local')->put($path, '{"a":1,"b":"hello"}');

        $event = IngestionEvent::query()->create([
            'integration_source_id' => $source->id,
            'direction' => IngestionEvent::DIRECTION_INBOUND_WEBHOOK,
            'status' => IngestionEvent::STATUS_PROCESSED,
            'payload_disk' => 'local',
            'payload_path' => $path,
            'bytes_received' => 19,
            'facts_created' => 1,
        ]);

        $response = $this->actingAs($user)
            ->getJson(route('integrations.sources.events.payload', [
                'integration_source' => $source,
                'ingestion_event' => $event->id,
            ]));

        $response->assertOk()
            ->assertJsonPath('truncated', false)
            ->assertJsonPath('total_bytes', 19);

        $this->assertStringContainsString('"a": 1', (string) $response->json('content'));
    }
}
