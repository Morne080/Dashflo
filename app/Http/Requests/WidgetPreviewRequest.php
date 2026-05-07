<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WidgetPreviewRequest extends FormRequest
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
            'widget' => ['required', 'array'],
            'widget.id' => ['nullable'],
            'widget.widget_type' => ['required', 'string', 'max:128'],
            'widget.metric_key' => ['nullable', 'string', 'max:128'],
            'widget.title' => ['nullable', 'string', 'max:255'],
            'widget.config_json' => ['present', 'array'],
            'widget.filters_json' => ['present', 'array'],
            'widget.layout_x' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'widget.layout_y' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'widget.layout_w' => ['sometimes', 'integer', 'min:1', 'max:65535'],
            'widget.layout_h' => ['sometimes', 'integer', 'min:1', 'max:65535'],
            'widget.sort_order' => ['sometimes', 'integer', 'min:0', 'max:2147483647'],
        ];
    }
}
