<?php

namespace Tests\Feature;

use App\Models\IngestionEvent;
use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class LeadsImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_tab_renders(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('leads.index', ['tab' => 'import']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Leads/Index')
                ->where('tab', 'import'));
    }

    public function test_csv_import_creates_facts_and_ingestion_event(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Importer',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $csv = "external_id,email,campaign\nlead-a,a@example.com,CAMP-1\nlead-b,b@example.com,CAMP-2\n";
        $file = UploadedFile::fake()->createWithContent('batch.csv', $csv);

        $response = $this->actingAs($user)->post(route('leads.import'), [
            'integration_source_id' => $source->id,
            'file' => $file,
        ]);

        $response->assertRedirect(route('leads.index', [
            'tab' => 'leads',
            'source_id' => $source->id,
        ]));

        $this->assertSame(2, IntegrationFact::query()->where('integration_source_id', $source->id)->count());

        $event = IngestionEvent::query()->where('integration_source_id', $source->id)->first();
        $this->assertNotNull($event);
        $this->assertSame(IngestionEvent::DIRECTION_INBOUND_IMPORT, $event->direction);
        $this->assertSame(IngestionEvent::STATUS_PROCESSED, $event->status);
        $this->assertSame(2, $event->facts_created);

        $fact = IntegrationFact::query()->where('external_id', 'lead-a')->first();
        $this->assertNotNull($fact);
        $meas = is_array($fact->measures) ? $fact->measures : [];
        $this->assertSame('a@example.com', $meas['email'] ?? null);
        $this->assertSame('CAMP-1', $meas['campaign'] ?? null);

        $source->refresh();
        $webhook = is_array($source->settings['webhook'] ?? null) ? $source->settings['webhook'] : [];
        $this->assertArrayHasKey('field_rows', $webhook);
        $incoming = array_values(array_filter(array_map(
            static fn ($r) => is_array($r) ? trim((string) ($r['incoming_key'] ?? '')) : '',
            $webhook['field_rows'],
        )));
        $this->assertContains('external_id', $incoming);
        $this->assertContains('email', $incoming);
        $this->assertContains('campaign', $incoming);
        $this->assertNotEmpty($webhook['sample_payload'] ?? '');
    }

    public function test_json_array_import_creates_facts(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'JSON source',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $json = json_encode([
            ['external_id' => 'x1', 'full_name' => 'Ada Lovelace'],
        ]);
        $file = UploadedFile::fake()->createWithContent('rows.json', $json);

        $this->actingAs($user)
            ->post(route('leads.import'), [
                'integration_source_id' => $source->id,
                'file' => $file,
            ])
            ->assertRedirect();

        $this->assertSame(1, IntegrationFact::query()->where('integration_source_id', $source->id)->count());

        $source->refresh();
        $webhook = is_array($source->settings['webhook'] ?? null) ? $source->settings['webhook'] : [];
        $incoming = array_values(array_filter(array_map(
            static fn ($r) => is_array($r) ? trim((string) ($r['incoming_key'] ?? '')) : '',
            $webhook['field_rows'] ?? [],
        )));
        $this->assertContains('external_id', $incoming);
        $this->assertContains('full_name', $incoming);
    }

    public function test_csv_import_respects_max_rows_config(): void
    {
        Config::set('lead_import.max_rows', 1);

        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Limited',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $csv = "external_id\na\nb\n";
        $file = UploadedFile::fake()->createWithContent('two.csv', $csv);

        $this->actingAs($user)
            ->post(route('leads.import'), [
                'integration_source_id' => $source->id,
                'file' => $file,
            ])
            ->assertRedirect(route('leads.index', ['tab' => 'import']))
            ->assertSessionHasErrors('file');

        $this->assertSame(0, IntegrationFact::query()->where('integration_source_id', $source->id)->count());
    }

    public function test_user_cannot_import_into_foreign_source(): void
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

        $csv = "external_id\nx\n";
        $file = UploadedFile::fake()->createWithContent('a.csv', $csv);

        $this->actingAs($other)
            ->post(route('leads.import'), [
                'integration_source_id' => $source->id,
                'file' => $file,
            ])
            ->assertNotFound();
    }
}
