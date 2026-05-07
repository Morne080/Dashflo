<?php

namespace Tests\Feature;

use App\Models\IngestionEvent;
use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadsPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_from_leads(): void
    {
        $this->get(route('leads.index'))
            ->assertRedirect(route('login'));
    }

    public function test_authenticated_user_sees_leads_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('leads.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Leads/Index')
                ->where('tab', 'leads')
                ->has('sources')
                ->has('filters')
                ->has('leads'));
    }

    public function test_leads_table_includes_parsed_fact_rows(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Leadflow',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $event = IngestionEvent::query()->create([
            'integration_source_id' => $source->id,
            'direction' => IngestionEvent::DIRECTION_INBOUND_WEBHOOK,
            'status' => IngestionEvent::STATUS_PROCESSED,
            'payload_disk' => null,
            'payload_path' => null,
            'bytes_received' => 10,
            'facts_created' => 1,
        ]);

        IntegrationFact::query()->create([
            'integration_source_id' => $source->id,
            'ingestion_event_id' => $event->id,
            'external_id' => 'ext-99',
            'occurred_at' => null,
            'dimensions' => [
                'name' => 'Vincent T. McIntosh',
                'campaign' => 'LEGAL-MVA-USA',
                'supplier' => 'James M',
                'source' => 'FACEBOOK',
            ],
            'measures' => ['score' => 10],
        ]);

        $this->actingAs($user)
            ->get(route('leads.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Leads/Index')
                ->has('leads.data', 1)
                ->where('leads.data.0.record_summary', 'Vincent T. McIntosh')
                ->where('leads.data.0.campaign', 'LEGAL-MVA-USA')
                ->where('leads.data.0.supplier', 'James M')
                ->where('leads.data.0.platform', 'FACEBOOK')
                ->where('leads.data.0.source_name', 'Leadflow'));
    }

    public function test_inbound_requests_tab_returns_events(): void
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

        IngestionEvent::query()->create([
            'integration_source_id' => $source->id,
            'direction' => IngestionEvent::DIRECTION_INBOUND_WEBHOOK,
            'status' => IngestionEvent::STATUS_RECEIVED,
            'payload_disk' => null,
            'payload_path' => null,
            'bytes_received' => 5,
            'facts_created' => 0,
        ]);

        $this->actingAs($user)
            ->get(route('leads.index', ['tab' => 'requests']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Leads/Index')
                ->where('tab', 'requests')
                ->has('requests.data', 1)
                ->where('requests.data.0.status', 'received'));
    }

    public function test_user_cannot_filter_by_another_users_source(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $owner->id,
            'name' => 'Private',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $this->actingAs($other)
            ->get(route('leads.index', ['source_id' => $source->id]))
            ->assertNotFound();
    }
}
