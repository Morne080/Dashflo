<?php

namespace App\Models;

use App\Support\LeadVerificationConfig;
use App\Support\WebhookEditorConfig;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class IntegrationSource extends Model
{
    public const KIND_WEBHOOK = 'webhook';

    public const KIND_REST_API = 'rest_api';

    protected $fillable = [
        'user_id',
        'name',
        'kind',
        'enabled',
        'ingest_token',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'settings' => 'encrypted:array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<IngestionEvent, $this> */
    public function ingestionEvents(): HasMany
    {
        return $this->hasMany(IngestionEvent::class);
    }

    /** @return HasMany<IntegrationFact, $this> */
    public function facts(): HasMany
    {
        return $this->hasMany(IntegrationFact::class);
    }

    public static function generateIngestToken(): string
    {
        return Str::lower(Str::random(64));
    }

    /**
     * @param  Builder<IntegrationSource>  $query
     * @return Builder<IntegrationSource>
     */
    public function scopeForUser($query, User $user)
    {
        return $query->where('user_id', $user->id);
    }

    /**
     * @param  mixed  $value
     * @param  string|null  $field
     * @return static
     */
    public function resolveRouteBinding($value, $field = null)
    {
        $field ??= $this->getRouteKeyName();

        return static::query()
            ->where($field, $value)
            ->where('user_id', auth()->id())
            ->firstOrFail();
    }

    /**
     * @return array{base_url?: string, auth_header?: string, auth_value?: string, path?: string}
     */
    public function restSettings(): array
    {
        if ($this->kind !== self::KIND_REST_API) {
            return [];
        }

        $settings = is_array($this->settings) ? $this->settings : [];
        $rest = $settings['rest'] ?? [];

        return is_array($rest) ? $rest : [];
    }

    /**
     * When true, toggles come from the owning user's workspace defaults; per-source values may still override secrets.
     * Missing `verifications` on the source → inherit. If `verifications` exists but `inherit_account_defaults` is absent → legacy per-source only (false).
     */
    public function verificationInheritsAccountDefaults(): bool
    {
        $settings = is_array($this->settings) ? $this->settings : [];
        if (! array_key_exists('verifications', $settings)) {
            return true;
        }

        $v = $settings['verifications'];
        if (! is_array($v)) {
            return true;
        }
        if (! array_key_exists('inherit_account_defaults', $v)) {
            return false;
        }

        return (bool) $v['inherit_account_defaults'];
    }

    /**
     * Per-source verification block only (encrypted settings), no account merge.
     *
     * @return array{
     *     twilio_lookup: array{enabled: bool, account_sid: string, auth_token: string},
     *     email_verification: array{enabled: bool},
     *     trustedform: array{enabled: bool, api_key: string},
     * }
     */
    public function rawSourceVerificationSettings(): array
    {
        $settings = is_array($this->settings) ? $this->settings : [];
        $v = is_array($settings['verifications'] ?? null) ? $settings['verifications'] : [];

        return LeadVerificationConfig::fromSettingsRoot($v);
    }

    /**
     * Effective verification config for this source (account defaults merged in when inheriting).
     *
     * @return array{
     *     twilio_lookup: array{enabled: bool, account_sid: string, auth_token: string},
     *     email_verification: array{enabled: bool},
     *     trustedform: array{enabled: bool, api_key: string},
     * }
     */
    public function mergedVerificationSettings(): array
    {
        if (! $this->verificationInheritsAccountDefaults()) {
            return $this->rawSourceVerificationSettings();
        }

        $user = $this->user;
        $account = $user instanceof User
            ? $user->accountVerificationSettings()
            : LeadVerificationConfig::fromSettingsRoot([]);

        $source = $this->rawSourceVerificationSettings();

        return [
            'twilio_lookup' => [
                'enabled' => $account['twilio_lookup']['enabled'],
                'account_sid' => $source['twilio_lookup']['account_sid'] !== ''
                    ? $source['twilio_lookup']['account_sid']
                    : $account['twilio_lookup']['account_sid'],
                'auth_token' => $source['twilio_lookup']['auth_token'] !== ''
                    ? $source['twilio_lookup']['auth_token']
                    : $account['twilio_lookup']['auth_token'],
            ],
            'email_verification' => [
                'enabled' => $account['email_verification']['enabled'],
            ],
            'trustedform' => [
                'enabled' => $account['trustedform']['enabled'],
                'api_key' => $source['trustedform']['api_key'] !== ''
                    ? $source['trustedform']['api_key']
                    : $account['trustedform']['api_key'],
            ],
        ];
    }

    /**
     * @return array{
     *     twilio_lookup: array{enabled: bool, account_sid: string, auth_token: string},
     *     email_verification: array{enabled: bool},
     *     trustedform: array{enabled: bool, api_key: string},
     * }
     */
    public function verificationSettings(): array
    {
        return $this->mergedVerificationSettings();
    }

    /**
     * Safe for Inertia / JSON (no raw secrets).
     *
     * @return array<string, mixed>
     */
    public function verificationSettingsForClient(): array
    {
        $raw = $this->rawSourceVerificationSettings();

        return [
            'inherit_account_defaults' => $this->verificationInheritsAccountDefaults(),
            'twilio_lookup' => [
                'enabled' => $raw['twilio_lookup']['enabled'],
                'account_sid' => $raw['twilio_lookup']['account_sid'],
                'auth_token_set' => $raw['twilio_lookup']['auth_token'] !== '',
            ],
            'email_verification' => [
                'enabled' => $raw['email_verification']['enabled'],
            ],
            'trustedform' => [
                'enabled' => $raw['trustedform']['enabled'],
                'api_key_set' => $raw['trustedform']['api_key'] !== '',
            ],
        ];
    }

    /**
     * @return array{account_sid: string, auth_token: string}|null
     */
    public function effectiveTwilioCredentials(): ?array
    {
        $v = $this->mergedVerificationSettings()['twilio_lookup'];
        $sid = $v['account_sid'] !== '' ? $v['account_sid'] : (string) env('TWILIO_ACCOUNT_SID', '');
        $token = $v['auth_token'] !== '' ? $v['auth_token'] : (string) env('TWILIO_AUTH_TOKEN', '');
        if ($sid === '' || $token === '') {
            return null;
        }

        return ['account_sid' => $sid, 'auth_token' => $token];
    }

    public function effectiveTrustedFormApiKey(): ?string
    {
        $key = $this->mergedVerificationSettings()['trustedform']['api_key'];
        if ($key !== '') {
            return $key;
        }
        $env = (string) env('TRUSTEDFORM_API_KEY', '');

        return $env !== '' ? $env : null;
    }

    /**
     * Inbound webhook editor block (settings.webhook).
     *
     * @return array<string, mixed>
     */
    public function webhookEditorSettings(): array
    {
        if ($this->kind !== self::KIND_WEBHOOK) {
            return WebhookEditorConfig::fromSettingsRoot([]);
        }
        $settings = is_array($this->settings) ? $this->settings : [];
        $w = is_array($settings['webhook'] ?? null) ? $settings['webhook'] : [];

        return WebhookEditorConfig::fromSettingsRoot($w);
    }

    /**
     * @return list<string>
     */
    public function webhookIncomingKeysForLabel(string $label): array
    {
        $needle = strtoupper(trim($label));
        $keys = [];
        foreach ($this->webhookEditorSettings()['field_rows'] as $row) {
            if (strtoupper(trim($row['label'])) !== $needle) {
                continue;
            }
            $k = trim($row['incoming_key']);
            if ($k !== '') {
                $keys[] = $k;
            }
        }

        return $keys;
    }

    /**
     * @return array{mode: 'json'|'plain', plain_body: string, json_message: string}
     */
    public function webhookIngestResponse(): array
    {
        $w = $this->webhookEditorSettings();

        return [
            'mode' => $w['response_mode'] === 'plain' ? 'plain' : 'json',
            'plain_body' => (string) $w['response_plain_body'],
            'json_message' => 'Accepted.',
        ];
    }
}
