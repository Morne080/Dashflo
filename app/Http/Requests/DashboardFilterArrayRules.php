<?php

namespace App\Http\Requests;

/**
 * Validation for a filter payload shaped like {@see \App\DTO\FilterRequest::toResponseArray()}.
 */
final class DashboardFilterArrayRules
{
    /**
     * @return array<string, mixed>
     */
    public static function rules(string $prefix = 'filters'): array
    {
        $p = $prefix === '' ? '' : rtrim($prefix, '.').'.';

        return [
            "{$p}date_from" => ['nullable', 'string', 'max:40'],
            "{$p}date_to" => ['nullable', 'string', 'max:40'],
            "{$p}source" => ['nullable', 'string', 'max:255'],
            "{$p}status" => ['nullable', 'string', 'max:64'],
            "{$p}vertical" => ['nullable', 'string', 'max:64'],
            "{$p}sol" => ['nullable', 'string', 'max:255'],
            "{$p}state" => ['nullable', 'string', 'max:8'],
            "{$p}supplier_code" => ['nullable', 'string', 'max:128'],
            "{$p}buyer_code" => ['nullable', 'string', 'max:128'],
            "{$p}custom_filters" => ['nullable', 'array'],
            "{$p}custom_filters.*.field" => ['required', 'string', 'max:128'],
            "{$p}custom_filters.*.value" => ['required', 'string', 'max:512'],
            "{$p}custom_filters.*.scope" => ['nullable', 'string', 'in:lead,fact'],
        ];
    }
}
