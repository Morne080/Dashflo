<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DashboardWidget extends Model
{
    protected $fillable = [
        'dashboard_id',
        'widget_type',
        'metric_key',
        'title',
        'config_json',
        'filters_json',
        'layout_x',
        'layout_y',
        'layout_w',
        'layout_h',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'config_json' => 'array',
            'filters_json' => 'array',
        ];
    }

    /** @return BelongsTo<Dashboard, $this> */
    public function dashboard(): BelongsTo
    {
        return $this->belongsTo(Dashboard::class);
    }
}
