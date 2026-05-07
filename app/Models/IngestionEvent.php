<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IngestionEvent extends Model
{
    public const DIRECTION_INBOUND_WEBHOOK = 'inbound_webhook';

    public const DIRECTION_OUTBOUND_PULL = 'outbound_pull';

    /** File upload from Leads → Import (CSV / JSON). */
    public const DIRECTION_INBOUND_IMPORT = 'inbound_import';

    public const STATUS_RECEIVED = 'received';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_PROCESSED = 'processed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'integration_source_id',
        'direction',
        'status',
        'idempotency_key',
        'http_status',
        'error_message',
        'payload_disk',
        'payload_path',
        'bytes_received',
        'facts_created',
    ];

    /** @return BelongsTo<IntegrationSource, $this> */
    public function integrationSource(): BelongsTo
    {
        return $this->belongsTo(IntegrationSource::class);
    }

    /** @return HasMany<IntegrationFact, $this> */
    public function facts(): HasMany
    {
        return $this->hasMany(IntegrationFact::class);
    }
}
