<?php

namespace Tests\Feature;

use App\Models\Dashboard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardsManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_dashboards(): void
    {
        $user = User::factory()->create();
        Dashboard::create([
            'user_id' => $user->id,
            'name' => 'A',
            'slug' => 'a-'.$user->id,
            'description' => 'Desc',
            'is_default' => true,
            'is_shared' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboards.index', absolute: false));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboards/Index')
            ->has('dashboards', 1));
    }

    public function test_user_can_create_empty_dashboard(): void
    {
        $user = User::factory()->create();
        Dashboard::ensureDefaultDashboard($user);

        $response = $this->actingAs($user)->post(route('dashboards.store', absolute: false), [
            'name' => 'Sales focus',
            'description' => 'Weekly review',
        ]);

        $new = Dashboard::query()->where('user_id', $user->id)->where('name', 'Sales focus')->first();
        $this->assertNotNull($new);
        $response->assertRedirect(route('dashboards.show', $new, absolute: false));
        $this->assertSame(0, $new->widgets()->count());
    }

    public function test_user_cannot_delete_only_dashboard(): void
    {
        $user = User::factory()->create();
        $dashboard = Dashboard::ensureDefaultDashboard($user);

        $response = $this->actingAs($user)->delete(route('dashboards.destroy', $dashboard, absolute: false));

        $response->assertForbidden();
        $this->assertDatabaseHas('dashboards', ['id' => $dashboard->id]);
    }
}
