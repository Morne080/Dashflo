<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIntegrationSourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('integration_source')) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'enabled' => ['sometimes', 'boolean'],
            'rest.base_url' => ['nullable', 'string', 'max:2048'],
            'rest.path' => ['nullable', 'string', 'max:512'],
            'rest.auth_header' => ['nullable', 'string', 'max:128'],
            'rest.auth_value' => ['nullable', 'string', 'max:2048'],
            'verifications' => ['sometimes', 'array'],
            'verifications.inherit_account_defaults' => ['sometimes', 'boolean'],
            'verifications.twilio_lookup' => ['sometimes', 'array'],
            'verifications.twilio_lookup.enabled' => ['sometimes', 'boolean'],
            'verifications.twilio_lookup.account_sid' => ['nullable', 'string', 'max:64'],
            'verifications.twilio_lookup.auth_token' => ['nullable', 'string', 'max:256'],
            'verifications.email_verification' => ['sometimes', 'array'],
            'verifications.email_verification.enabled' => ['sometimes', 'boolean'],
            'verifications.trustedform' => ['sometimes', 'array'],
            'verifications.trustedform.enabled' => ['sometimes', 'boolean'],
            'verifications.trustedform.api_key' => ['nullable', 'string', 'max:512'],
            'webhook' => ['sometimes', 'array'],
            'webhook.category' => ['nullable', 'string', 'max:64'],
            'webhook.description' => ['nullable', 'string', 'max:2000'],
            'webhook.webhook_version' => ['nullable', 'string', 'max:32'],
            'webhook.payload_type' => ['nullable', 'string', Rule::in(['json', 'custom'])],
            'webhook.capture_method' => ['nullable', 'string', 'max:512'],
            'webhook.sample_payload' => ['nullable', 'string', 'max:65535'],
            'webhook.encryption_type' => ['nullable', 'string', 'max:64'],
            'webhook.output_timezone' => ['nullable', 'string', 'max:120'],
            'webhook.field_rows' => ['nullable', 'array'],
            'webhook.field_rows.*.label' => ['nullable', 'string', 'max:80'],
            'webhook.field_rows.*.incoming_key' => ['nullable', 'string', 'max:120'],
            'webhook.field_rows.*.static_value' => ['nullable', 'string', 'max:2000'],
            'webhook.response_mode' => ['nullable', 'string', Rule::in(['json', 'plain'])],
            'webhook.response_plain_body' => ['nullable', 'string', 'max:2000'],
            'webhook.custom_headers_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
