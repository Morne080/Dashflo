<?php

namespace App\Http\Requests;

use App\Models\Dashboard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SyncDashboardWidgetsRequest extends FormRequest
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
        /** @var Dashboard $dashboard */
        $dashboard = $this->route('dashboard');

        return array_merge([
            'widgets' => ['required', 'array'],
            'filters' => ['sometimes', 'array'],
            'widgets.*.id' => [
                'nullable',
                'integer',
                Rule::exists('dashboard_widgets', 'id')->where(
                    fn ($q) => $q->where('dashboard_id', $dashboard->id),
                ),
            ],
            'widgets.*.widget_type' => ['required', 'string', 'max:128'],
            'widgets.*.metric_key' => ['nullable', 'string', 'max:128'],
            'widgets.*.title' => ['nullable', 'string', 'max:255'],
            'widgets.*.config_json' => ['present', 'array'],
            'widgets.*.filters_json' => ['present', 'array'],
            'widgets.*.layout_x' => ['required', 'integer', 'min:0', 'max:65535'],
            'widgets.*.layout_y' => ['required', 'integer', 'min:0', 'max:65535'],
            'widgets.*.layout_w' => ['required', 'integer', 'min:1', 'max:65535'],
            'widgets.*.layout_h' => ['required', 'integer', 'min:1', 'max:65535'],
            'widgets.*.sort_order' => ['required', 'integer', 'min:0', 'max:2147483647'],
        ], DashboardFilterArrayRules::rules('filters'));
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            $ids = collect($this->input('widgets', []))
                ->pluck('id')
                ->filter(fn ($id) => $id !== null && $id !== '')
                ->map(fn ($id) => (int) $id)
                ->all();

            if (count($ids) !== count(array_unique($ids))) {
                $v->errors()->add('widgets', 'Duplicate widget ids in payload.');
            }
        });
    }
}
