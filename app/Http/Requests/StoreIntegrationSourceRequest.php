<?php

namespace App\Http\Requests;

use App\Models\IntegrationSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIntegrationSourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'enabled' => ['sometimes', 'boolean'],
            'kind' => ['required', 'string', Rule::in([IntegrationSource::KIND_WEBHOOK, IntegrationSource::KIND_REST_API])],
            'rest.base_url' => ['nullable', 'string', 'max:2048', 'required_if:kind,'.IntegrationSource::KIND_REST_API],
            'rest.path' => ['nullable', 'string', 'max:512'],
            'rest.auth_header' => ['nullable', 'string', 'max:128'],
            'rest.auth_value' => ['nullable', 'string', 'max:2048'],
            'webhook' => ['nullable', 'array'],
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
