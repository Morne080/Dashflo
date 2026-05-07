<?php

namespace App\Models;

use App\Enums\LeadVertical;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Buyer extends Model
{
    protected $fillable = [
        'buyer_code',
        'vertical',
        'name',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'vertical' => LeadVertical::class,
            'active' => 'boolean',
        ];
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }
}
