<?php

namespace Tests\Feature;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class LeadImportChunkTest extends TestCase
{
    use RefreshDatabase;

    public function test_chunked_json_import_creates_facts(): void
    {
        Config::set('lead_import.chunked_upload_threshold_kb', 1);
        Config::set('lead_import.chunk_upload_kb', 4);

        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Chunk source',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $payload = [];
        for ($i = 1; $i <= 20; $i++) {
            $payload[] = ['external_id' => 'c'.$i, 'note' => 'row', 'pad' => str_repeat('x', 80)];
        }
        $raw = json_encode($payload);
        $this->assertNotFalse($raw);
        $totalBytes = strlen($raw);
        $this->assertGreaterThan(1024, $totalBytes);

        $acting = $this->actingAs($user);

        $uploadId = $acting
            ->postJson(route('leads.import.chunk.start'), [
                'integration_source_id' => $source->id,
                'extension' => 'json',
                'total_bytes' => $totalBytes,
            ])
            ->assertOk()
            ->json('upload_id');
        $this->assertIsString($uploadId);

        $offset = 0;
        $chunkSize = 4096;
        while ($offset < $totalBytes) {
            $piece = substr($raw, $offset, $chunkSize);
            $offset += strlen($piece);
            $chunkFile = UploadedFile::fake()->createWithContent('chunk.bin', $piece);
            $acting->post(route('leads.import.chunk.push'), [
                'upload_id' => $uploadId,
                'chunk' => $chunkFile,
            ])->assertOk();
        }

        $acting
            ->postJson(route('leads.import.chunk.commit'), [
                'upload_id' => $uploadId,
                'integration_source_id' => $source->id,
            ])
            ->assertOk()
            ->assertJsonStructure(['redirect']);

        $this->assertSame(20, IntegrationFact::query()->where('integration_source_id', $source->id)->count());
    }
}
