<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Dashboard extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'filters_json',
        'is_default',
        'is_shared',
    ];

    protected function casts(): array
    {
        return [
            'filters_json' => 'array',
            'is_default' => 'boolean',
            'is_shared' => 'boolean',
        ];
    }

    /** @return HasMany<DashboardWidget, $this> */
    public function widgets(): HasMany
    {
        return $this->hasMany(DashboardWidget::class)->orderBy('sort_order');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @param  Builder<Dashboard>  $query
     * @return Builder<Dashboard>
     */
    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }

    public function isEditableBy(User $user): bool
    {
        return (int) $this->user_id === (int) $user->id;
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
            ->where('user_id', auth()->id())
            ->firstOrFail();
    }

    /**
     * Default (or first) dashboard for analytics home redirect, creating one if missing.
     */
    public static function ensureDefaultDashboard(User $user): self
    {
        $dashboard = static::query()
            ->where('user_id', $user->id)
            ->where('is_default', true)
            ->first();

        if ($dashboard !== null) {
            return $dashboard;
        }

        $dashboard = static::query()
            ->where('user_id', $user->id)
            ->orderBy('id')
            ->first();

        if ($dashboard !== null) {
            $dashboard->forceFill(['is_default' => true])->save();

            return $dashboard->fresh() ?? $dashboard;
        }

        return static::create([
            'user_id' => $user->id,
            'name' => 'Overview',
            'slug' => 'overview-'.$user->id,
            'description' => null,
            'is_default' => true,
            'is_shared' => false,
        ]);
    }

    public static function uniqueSlugForUser(User $user, string $name): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'dashboard';
        }

        $slug = $base;
        $suffix = 0;

        while (static::query()->where('user_id', $user->id)->where('slug', $slug)->exists()) {
            $suffix++;
            $slug = $base.'-'.$suffix;
        }

        return $slug;
    }
}
