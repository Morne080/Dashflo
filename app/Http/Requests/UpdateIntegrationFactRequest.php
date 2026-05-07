<?php

namespace App\Http\Requests;

use App\Models\IntegrationFact;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIntegrationFactRequest extends FormRequest
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
            'fields' => ['required', 'array', 'max:400'],
            'fields.*.bag' => ['required', Rule::in(['dimensions', 'measures'])],
            'fields.*.key' => ['required', 'string', 'max:255'],
            'fields.*.value' => ['nullable', 'string', 'max:50000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $fact = $this->route('integration_fact');
            if (! $fact instanceof IntegrationFact) {
                return;
            }

            $dims = is_array($fact->dimensions) ? $fact->dimensions : [];
            $meas = is_array($fact->measures) ? $fact->measures : [];

            foreach ($this->input('fields', []) as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }
                $bag = $row['bag'] ?? null;
                $key = $row['key'] ?? null;
                if (! is_string($bag) || ! is_string($key)) {
                    continue;
                }
                if ($bag === 'dimensions' && ! array_key_exists($key, $dims)) {
                    $validator->errors()->add("fields.$i.key", 'Unknown dimension field: '.$key);
                }
                if ($bag === 'measures' && ! array_key_exists($key, $meas)) {
                    $validator->errors()->add("fields.$i.key", 'Unknown measure field: '.$key);
                }
            }
        });
    }
}
