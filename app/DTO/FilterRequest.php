<?php

namespace App\DTO;

use App\Models\User;
use App\Support\LeadCustomFilters;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Dashboard filter state from the query string.
 *
 * `date_from` / `date_to` default to the current calendar month when omitted.
 */
final class FilterRequest
{
    /**
     * @param  list<array{field: string, value: string, scope?: string}>  $customFilters
     */
    public function __construct(
        public readonly string $dateFrom,
        public readonly string $dateTo,
        public readonly ?string $source,
        public readonly ?string $status,
        public readonly ?string $vertical,
        public readonly ?string $sol,
        public readonly ?string $state,
        public readonly ?string $supplierCode,
        public readonly ?string $buyerCode,
        public readonly array $customFilters = [],
        public readonly ?int $filterUserId = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        /** @var User|null $user */
        $user = $request->user();

        return self::fromDashboardFilters([
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'source' => $request->input('source'),
            'status' => $request->input('status'),
            'vertical' => $request->input('vertical'),
            'sol' => $request->input('sol'),
            'state' => $request->input('state'),
            'supplier_code' => $request->input('supplier_code'),
            'buyer_code' => $request->input('buyer_code'),
            'custom_filters' => $request->input('custom_filters'),
        ], $user, $user?->id);
    }

    /**
     * Build filters from the same snake_case shape as {@see self::toArray()} (dashboard query / Inertia props).
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromDashboardFilters(array $data, ?User $userForDiscovery = null, ?int $filterUserIdOverride = null): self
    {
        $filterUserId = $filterUserIdOverride ?? (isset($data['_filter_user_id']) ? (int) $data['_filter_user_id'] : null);

        $from = ! empty($data['date_from'])
            ? Carbon::parse((string) $data['date_from'])->startOfDay()
            : now()->startOfMonth()->startOfDay();

        $to = ! empty($data['date_to'])
            ? Carbon::parse((string) $data['date_to'])->endOfDay()
            : now()->endOfMonth()->endOfDay();

        $state = $data['state'] ?? null;
        if ($state !== null && $state !== '') {
            $state = strtoupper((string) $state);
        } else {
            $state = null;
        }

        $discoveryUser = $userForDiscovery ?? ($filterUserId !== null ? User::query()->find($filterUserId) : null);

        $customFilters = LeadCustomFilters::normalize(
            $data['custom_filters'] ?? null,
            $discoveryUser,
            $filterUserId,
        );

        return new self(
            dateFrom: $from->toDateString(),
            dateTo: $to->toDateString(),
            source: ! empty($data['source']) ? (string) $data['source'] : null,
            status: ! empty($data['status']) ? (string) $data['status'] : null,
            vertical: ! empty($data['vertical']) ? (string) $data['vertical'] : null,
            sol: ! empty($data['sol']) ? (string) $data['sol'] : null,
            state: $state,
            supplierCode: ! empty($data['supplier_code']) ? (string) $data['supplier_code'] : null,
            buyerCode: ! empty($data['buyer_code']) ? (string) $data['buyer_code'] : null,
            customFilters: $customFilters,
            filterUserId: $filterUserId,
        );
    }

    /**
     * Same filters, date range shifted to the immediately preceding period of equal length.
     */
    public function previousPeriod(): self
    {
        $from = Carbon::parse($this->dateFrom)->startOfDay();
        $to = Carbon::parse($this->dateTo)->startOfDay();
        $days = (int) $from->diffInDays($to) + 1;

        $prevEnd = $from->copy()->subDay();
        $prevStart = $prevEnd->copy()->subDays($days - 1);

        return new self(
            dateFrom: $prevStart->toDateString(),
            dateTo: $prevEnd->toDateString(),
            source: $this->source,
            status: $this->status,
            vertical: $this->vertical,
            sol: $this->sol,
            state: $this->state,
            supplierCode: $this->supplierCode,
            buyerCode: $this->buyerCode,
            customFilters: $this->customFilters,
            filterUserId: $this->filterUserId,
        );
    }

    public function cacheKey(): string
    {
        return hash('xxh128', json_encode($this->toArray()));
    }

    /**
     * Internal / merged shape (includes `_filter_user_id` for widget metrics). Not sent to the browser.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $rows = [];
        foreach ($this->customFilters as $row) {
            $out = [
                'field' => $row['field'],
                'value' => $row['value'],
            ];
            $scope = $row['scope'] ?? 'lead';
            if ($scope !== '') {
                $out['scope'] = $scope;
            }
            $rows[] = $out;
        }

        $a = [
            'date_from' => $this->dateFrom,
            'date_to' => $this->dateTo,
            'source' => $this->source,
            'status' => $this->status,
            'vertical' => $this->vertical,
            'sol' => $this->sol,
            'state' => $this->state,
            'supplier_code' => $this->supplierCode,
            'buyer_code' => $this->buyerCode,
            'custom_filters' => $rows,
        ];

        if ($this->filterUserId !== null) {
            $a['_filter_user_id'] = $this->filterUserId;
        }

        return $a;
    }

    /**
     * @return array<string, mixed>
     */
    public function toResponseArray(): array
    {
        $a = $this->toArray();
        unset($a['_filter_user_id']);

        return $a;
    }
}
