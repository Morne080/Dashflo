<?php

namespace Tests\Feature;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationsWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_accepts_post_without_signature_and_creates_facts(): void
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

        $payload = [
            'records' => [
                ['id' => 'a1', 'revenue' => 10.5, 'label' => 'x'],
                ['id' => 'a2', 'revenue' => 2],
            ],
        ];
        $body = json_encode($payload);
        $this->assertIsString($body);

        $this->call('POST', '/hooks/ingest/'.$source->ingest_token, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertAccepted();

        $this->assertSame(2, IntegrationFact::query()->where('integration_source_id', $source->id)->count());
    }

    public function test_repeated_posts_without_idempotency_create_multiple_events_and_facts(): void
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

        $body = json_encode([['id' => 'z', 'n' => 1]]);
        $this->assertIsString($body);

        $this->call('POST', '/hooks/ingest/'.$source->ingest_token, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertAccepted();
        $this->assertSame(1, IntegrationFact::query()->where('integration_source_id', $source->id)->count());

        $this->call('POST', '/hooks/ingest/'.$source->ingest_token, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertAccepted();
        $this->assertSame(2, IntegrationFact::query()->where('integration_source_id', $source->id)->count());
    }
}
