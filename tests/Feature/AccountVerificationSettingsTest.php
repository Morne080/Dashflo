<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountVerificationSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_save_workspace_verification_defaults(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('profile.verification-settings.update'), [
                'verifications' => [
                    'twilio_lookup' => [
                        'enabled' => true,
                        'account_sid' => 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                        'auth_token' => 'my-secret-token',
                    ],
                    'email_verification' => [
                        'enabled' => true,
                    ],
                    'trustedform' => [
                        'enabled' => false,
                    ],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertTrue($user->accountVerificationSettings()['twilio_lookup']['enabled']);
        $this->assertTrue($user->accountVerificationSettings()['email_verification']['enabled']);
        $this->assertSame(
            'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            $user->accountVerificationSettings()['twilio_lookup']['account_sid'],
        );
        $this->assertSame('my-secret-token', $user->accountVerificationSettings()['twilio_lookup']['auth_token']);
    }
}
