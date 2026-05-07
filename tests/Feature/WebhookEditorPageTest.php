<?php

namespace Tests\Feature;

use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookEditorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_open_webhook_create_form(): void
    {
        $this->get(route('integrations.sources.create'))
            ->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_user_can_open_webhook_create_form(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('integrations.sources.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Integrations/WebhookForm')
                ->where('mode', 'create')
                ->has('default_webhook'));
    }

    public function test_owner_can_open_webhook_edit_form(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Partner A',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $this->actingAs($user)
            ->get(route('integrations.sources.edit', $source))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Integrations/WebhookForm')
                ->where('mode', 'edit')
                ->has('source')
                ->where('source.name', 'Partner A')
                ->has('source.webhook'));
    }

    public function test_api_connector_edit_redirects_to_show(): void
    {
        $user = User::factory()->create();
        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'REST',
            'kind' => IntegrationSource::KIND_REST_API,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => ['rest' => ['base_url' => 'https://example.com', 'path' => '/v1']],
        ]);

        $this->actingAs($user)
            ->get(route('integrations.sources.edit', $source))
            ->assertRedirect(route('integrations.sources.show', $source, absolute: false));
    }
}
