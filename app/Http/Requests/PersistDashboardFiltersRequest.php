<?php

namespace App\Http\Requests;

use App\Models\Dashboard;
use Illuminate\Foundation\Http\FormRequest;

class PersistDashboardFiltersRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Dashboard $dashboard */
        $dashboard = $this->route('dashboard');

        return $this->user() !== null && $this->user()->can('update', $dashboard);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_merge([
            'filters' => ['required', 'array'],
        ], DashboardFilterArrayRules::rules('filters'));
    }
}
