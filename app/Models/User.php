<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\LeadVerificationConfig;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_admin',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'verification_settings' => 'encrypted:array',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->is_admin === true;
    }

    /** @return HasMany<Dashboard, $this> */
    public function dashboards(): HasMany
    {
        return $this->hasMany(Dashboard::class);
    }

    /** @return HasMany<IntegrationSource, $this> */
    public function integrationSources(): HasMany
    {
        return $this->hasMany(IntegrationSource::class);
    }

    /**
     * Workspace-wide defaults (encrypted on the user). Used when an integration source inherits account settings.
     *
     * @return array{
     *     twilio_lookup: array{enabled: bool, account_sid: string, auth_token: string},
     *     email_verification: array{enabled: bool},
     *     trustedform: array{enabled: bool, api_key: string},
     * }
     */
    public function accountVerificationSettings(): array
    {
        $root = is_array($this->verification_settings) ? $this->verification_settings : [];

        return LeadVerificationConfig::fromSettingsRoot($root);
    }

    /**
     * @return array<string, mixed>
     */
    public function accountVerificationSettingsForClient(): array
    {
        return LeadVerificationConfig::forClient($this->accountVerificationSettings());
    }

    /**
     * @return array{account_sid: string, auth_token: string}|null
     */
    public function effectiveAccountTwilioCredentials(): ?array
    {
        $v = $this->accountVerificationSettings()['twilio_lookup'];
        $sid = $v['account_sid'] !== '' ? $v['account_sid'] : (string) env('TWILIO_ACCOUNT_SID', '');
        $token = $v['auth_token'] !== '' ? $v['auth_token'] : (string) env('TWILIO_AUTH_TOKEN', '');
        if ($sid === '' || $token === '') {
            return null;
        }

        return ['account_sid' => $sid, 'auth_token' => $token];
    }

    public function effectiveAccountTrustedFormApiKey(): ?string
    {
        $key = $this->accountVerificationSettings()['trustedform']['api_key'];
        if ($key !== '') {
            return $key;
        }
        $env = (string) env('TRUSTEDFORM_API_KEY', '');

        return $env !== '' ? $env : null;
    }
}
