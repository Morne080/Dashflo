<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AccountVerificationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'verifications' => ['required', 'array'],
            'verifications.twilio_lookup' => ['sometimes', 'array'],
            'verifications.twilio_lookup.enabled' => ['sometimes', 'boolean'],
            'verifications.twilio_lookup.account_sid' => ['nullable', 'string', 'max:64'],
            'verifications.twilio_lookup.auth_token' => ['nullable', 'string', 'max:256'],
            'verifications.email_verification' => ['sometimes', 'array'],
            'verifications.email_verification.enabled' => ['sometimes', 'boolean'],
            'verifications.trustedform' => ['sometimes', 'array'],
            'verifications.trustedform.enabled' => ['sometimes', 'boolean'],
            'verifications.trustedform.api_key' => ['nullable', 'string', 'max:512'],
        ];
    }
}
