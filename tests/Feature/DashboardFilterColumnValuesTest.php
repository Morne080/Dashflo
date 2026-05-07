<?php

namespace Tests\Feature;

use App\Enums\LeadStatus;
use App\Enums\LeadVertical;
use App\Models\Buyer;
use App\Models\Lead;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardFilterColumnValuesTest extends TestCase
{
    use RefreshDatabase;

    public function test_column_values_returns_distinct_utm_sources_scoped_by_traffic_source(): void
    {
        $user = User::factory()->create();

        $supplier = Supplier::query()->create([
            'supplier_code' => 'T_FILTER',
            'name' => 'Test Supplier',
            'default_lead_type' => 'MVA PI',
            'active' => true,
        ]);

        $buyer = Buyer::query()->create([
            'buyer_code' => 'B_FILTER',
            'vertical' => LeadVertical::MVA,
            'name' => 'Buyer',
            'active' => true,
        ]);

        $leadDefaults = [
            'vertical' => LeadVertical::MVA,
            'state' => 'TX',
            'accident_date' => null,
            'accident_sol' => null,
            'treatment_time' => null,
            'injury_type' => null,
            'phone_verification' => null,
            'supplier_id' => $supplier->id,
            'lead_type' => 'MVA PI',
            'disposition' => null,
            'cost' => 0,
            'revenue' => 0,
            'ipl' => 0,
            'is_conversion' => false,
            'buyer_id' => $buyer->id,
        ];

        Lead::query()->create([
            ...$leadDefaults,
            'external_id' => 'a1',
            'source' => 'Alpha',
            'utm_source' => 'google',
            'status' => LeadStatus::Sold,
        ]);

        Lead::query()->create([
            ...$leadDefaults,
            'external_id' => 'a2',
            'source' => 'Beta',
            'utm_source' => 'fb',
            'status' => LeadStatus::Sold,
        ]);

        Lead::query()->create([
            ...$leadDefaults,
            'external_id' => 'a3',
            'source' => 'Alpha',
            'utm_source' => 'email',
            'status' => LeadStatus::Sold,
        ]);

        $response = $this->actingAs($user)->getJson(route('dashboard.filter-column-values', [
            'column' => 'utm_source',
            'traffic_source' => 'Alpha',
        ]));

        $response->assertOk()
            ->assertJsonPath('values', ['email', 'google']);
    }

    public function test_column_values_rejects_unknown_column(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('dashboard.filter-column-values', [
                'column' => 'not_a_column',
            ]))
            ->assertStatus(422);
    }
}
