<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationFact extends Model
{
    protected $fillable = [
        'integration_source_id',
        'ingestion_event_id',
        'external_id',
        'occurred_at',
        'dimensions',
        'measures',
        'verifications',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'dimensions' => 'array',
            'measures' => 'array',
            'verifications' => 'array',
        ];
    }

    /** @return BelongsTo<IntegrationSource, $this> */
    public function integrationSource(): BelongsTo
    {
        return $this->belongsTo(IntegrationSource::class);
    }

    /** @return BelongsTo<IngestionEvent, $this> */
    public function ingestionEvent(): BelongsTo
    {
        return $this->belongsTo(IngestionEvent::class);
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
            ->whereHas('integrationSource', fn ($q) => $q->where('user_id', auth()->id()))
            ->firstOrFail();
    }
}
