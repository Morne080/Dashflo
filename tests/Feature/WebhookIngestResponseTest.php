<?php

namespace Tests\Feature;

use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class WebhookIngestResponseTest extends TestCase
{
    use RefreshDatabase;

    public function test_plain_response_mode_returns_configured_body(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $token = IntegrationSource::generateIngestToken();
        IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => $token,
            'settings' => [
                'webhook' => [
                    'response_mode' => 'plain',
                    'response_plain_body' => 'OK-INGEST',
                ],
            ],
        ]);

        $plain = $this->postJson('/hooks/ingest/'.$token, ['email' => 'a@b.com']);

        $plain->assertStatus(Response::HTTP_ACCEPTED)
            ->assertHeader('Content-Type', 'text/plain; charset=UTF-8');

        $this->assertSame('OK-INGEST', $plain->getContent());
    }

    public function test_json_response_mode_returns_json_envelope(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $token = IntegrationSource::generateIngestToken();
        IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => $token,
            'settings' => [
                'webhook' => [
                    'response_mode' => 'json',
                ],
            ],
        ]);

        $response = $this->postJson('/hooks/ingest/'.$token, ['email' => 'a@b.com']);

        $response->assertStatus(Response::HTTP_ACCEPTED)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonPath('message', 'Accepted.');

        $this->assertIsInt($response->json('ingestion_event_id'));
    }
}
