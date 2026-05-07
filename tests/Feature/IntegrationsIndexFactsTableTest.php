<?php

namespace Tests\Feature;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationsIndexFactsTableTest extends TestCase
{
    use RefreshDatabase;

    public function test_integrations_index_includes_paginated_recent_facts(): void
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

        IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => null,
            'external_id' => 'row-1',
            'occurred_at' => null,
            'dimensions' => ['region' => 'EU'],
            'measures' => ['count' => 3],
        ]);

        $this->actingAs($user)
            ->get(route('integrations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Integrations/Index')
                ->has('recentFacts.data', 1)
                ->where('recentFacts.data.0.external_id', 'row-1')
                ->where('recentFacts.data.0.source_name', 'CRM'));
    }
}
