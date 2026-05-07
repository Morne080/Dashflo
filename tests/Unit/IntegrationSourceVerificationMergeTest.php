<?php

namespace Tests\Unit;

use App\Models\IntegrationSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationSourceVerificationMergeTest extends TestCase
{
    use RefreshDatabase;

    public function test_source_without_verifications_block_inherits_account_toggles(): void
    {
        $user = User::factory()->create();
        $user->verification_settings = [
            'twilio_lookup' => [
                'enabled' => true,
                'account_sid' => '',
                'auth_token' => '',
            ],
            'email_verification' => ['enabled' => false],
            'trustedform' => ['enabled' => true, 'api_key' => ''],
        ];
        $user->save();

        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [],
        ]);

        $this->assertTrue($source->verificationInheritsAccountDefaults());
        $merged = $source->mergedVerificationSettings();
        $this->assertTrue($merged['twilio_lookup']['enabled']);
        $this->assertFalse($merged['email_verification']['enabled']);
        $this->assertTrue($merged['trustedform']['enabled']);
    }

    public function test_legacy_source_with_saved_verifications_and_no_inherit_flag_does_not_use_account_toggles(): void
    {
        $user = User::factory()->create();
        $user->verification_settings = [
            'twilio_lookup' => ['enabled' => true, 'account_sid' => '', 'auth_token' => ''],
            'email_verification' => ['enabled' => true],
            'trustedform' => ['enabled' => false, 'api_key' => ''],
        ];
        $user->save();

        $source = IntegrationSource::query()->create([
            'user_id' => $user->id,
            'name' => 'Hook',
            'kind' => IntegrationSource::KIND_WEBHOOK,
            'enabled' => true,
            'ingest_token' => IntegrationSource::generateIngestToken(),
            'settings' => [
                'verifications' => [
                    'twilio_lookup' => ['enabled' => false, 'account_sid' => '', 'auth_token' => ''],
                    'email_verification' => ['enabled' => false],
                    'trustedform' => ['enabled' => false, 'api_key' => ''],
                ],
            ],
        ]);

        $this->assertFalse($source->verificationInheritsAccountDefaults());
        $merged = $source->mergedVerificationSettings();
        $this->assertFalse($merged['twilio_lookup']['enabled']);
        $this->assertFalse($merged['email_verification']['enabled']);
    }
}
