<?php

namespace App\Models;

use App\Enums\LeadStatus;
use App\Enums\LeadVertical;
use App\Enums\PhoneVerification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    protected $fillable = [
        'external_id',
        'vertical',
        'state',
        'accident_date',
        'accident_sol',
        'treatment_time',
        'injury_type',
        'phone_verification',
        'supplier_id',
        'source',
        'utm_source',
        'lead_type',
        'status',
        'disposition',
        'cost',
        'revenue',
        'ipl',
        'is_conversion',
        'buyer_id',
    ];

    protected function casts(): array
    {
        return [
            'vertical' => LeadVertical::class,
            'status' => LeadStatus::class,
            'phone_verification' => PhoneVerification::class,
            'accident_date' => 'date',
            'cost' => 'decimal:2',
            'revenue' => 'decimal:2',
            'ipl' => 'decimal:2',
            'is_conversion' => 'boolean',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(Buyer::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
