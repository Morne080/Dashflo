<?php

namespace Tests\Feature;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_patch_lead_dimension_fields(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'CRM',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $fact = IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'ext-1',
            'occurred_at' => null,
            'dimensions' => ['email' => 'old@example.com', 'city' => 'DC'],
            'measures' => ['score' => 1],
        ]);

        $this->actingAs($user)
            ->patch(route('leads.update', $fact), [
                'fields' => [
                    ['bag' => 'dimensions', 'key' => 'email', 'value' => 'new@example.com'],
                ],
            ])
            ->assertRedirect(route('leads.show', $fact));

        $fact->refresh();
        $this->assertSame('new@example.com', $fact->dimensions['email']);
        $this->assertSame('DC', $fact->dimensions['city']);
        $this->assertSame(1, $fact->measures['score']);
    }

    public function test_owner_can_clear_dimension_field_with_empty_string(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'CRM',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $fact = IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => null,
            'occurred_at' => null,
            'dimensions' => ['city' => 'DC', 'keep' => 'yes'],
            'measures' => [],
        ]);

        $this->actingAs($user)
            ->patch(route('leads.update', $fact), [
                'fields' => [
                    ['bag' => 'dimensions', 'key' => 'city', 'value' => '   '],
                ],
            ])
            ->assertRedirect(route('leads.show', $fact));

        $fact->refresh();
        $this->assertArrayNotHasKey('city', $fact->dimensions ?? []);
        $this->assertSame('yes', $fact->dimensions['keep']);
    }

    public function test_other_user_cannot_update_lead(): void
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
            'external_id' => null,
            'occurred_at' => null,
            'dimensions' => ['email' => 'keep@example.com'],
            'measures' => [],
        ]);

        $this->actingAs($intruder)
            ->patch(route('leads.update', $fact), [
                'fields' => [
                    ['bag' => 'dimensions', 'key' => 'email', 'value' => 'hacked@example.com'],
                ],
            ])
            ->assertNotFound();
    }

    public function test_unknown_field_key_returns_validation_error(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'CRM',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $fact = IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => null,
            'occurred_at' => null,
            'dimensions' => ['a' => '1'],
            'measures' => [],
        ]);

        $this->actingAs($user)
            ->patch(route('leads.update', $fact), [
                'fields' => [
                    ['bag' => 'dimensions', 'key' => 'nope', 'value' => 'x'],
                ],
            ])
            ->assertSessionHasErrors();
    }
}
