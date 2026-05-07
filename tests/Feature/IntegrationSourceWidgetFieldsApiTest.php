<?php

namespace Tests\Feature;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationSourceWidgetFieldsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_receives_dimension_and_measure_keys(): void
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

        IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'e1',
            'occurred_at' => now(),
            'dimensions' => ['email' => 'a@example.com', 'city' => 'Austin'],
            'measures' => ['score' => 12.5],
        ]);

        $response = $this->actingAs($user)->getJson(route('api.integration-sources.widget-fields', $source));

        $response->assertOk();
        $this->assertContains('email', $response->json('dimension_keys'));
        $this->assertContains('city', $response->json('dimension_keys'));
        $this->assertContains('score', $response->json('measure_keys'));
        $this->assertNotEmpty($response->json('fact_fields'));
    }

    public function test_other_user_cannot_access_field_suggestions(): void
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
            ->getJson(route('api.integration-sources.widget-fields', $source))
            ->assertNotFound();
    }
}
