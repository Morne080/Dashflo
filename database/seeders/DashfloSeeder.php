<?php

namespace Database\Seeders;

use App\Enums\LeadStatus;
use App\Enums\LeadVertical;
use App\Enums\PhoneVerification;
use App\Models\Buyer;
use App\Models\Lead;
use App\Models\Supplier;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * ~1,170 April 2026 leads aligned to dashboard PDF-style totals.
 */
class DashfloSeeder extends Seeder
{
    private const TARGET_COST = 30108.0;

    private const TARGET_REVENUE = 71874.0;

    /** Total leads (sold + unsold + dq + returned + converted + fake). */
    private const TOTAL_LEADS = 1170;

    /** AG5 + TFISH + DQ rows (bulk of DQ volume). */
    private const FORCED_AG5_TFISH_DQ = 644;

    /** Target TFISH rows across entire month (includes forced block). */
    private const TARGET_TFISH_TOTAL = 657;

    public function run(): void
    {
        $faker = fake();

        Lead::query()->delete();

        $suppliers = $this->seedSuppliers();
        $buyers = $this->seedBuyers();

        $supplierIds = collect($suppliers)->mapWithKeys(
            fn (Supplier $s) => [$s->supplier_code => $s->id],
        )->all();

        $buyerModelsByCode = collect($buyers)->keyBy('buyer_code');
        $buyerIds = $buyerModelsByCode->map->id->all();

        $indices = range(0, self::TOTAL_LEADS - 1);
        shuffle($indices);
        $forcedIndices = array_slice($indices, 0, self::FORCED_AG5_TFISH_DQ);
        $restIndices = array_slice($indices, self::FORCED_AG5_TFISH_DQ);

        $statusesRest = array_merge(
            array_fill(0, 199, LeadStatus::Sold),
            array_fill(0, 144, LeadStatus::Unsold),
            array_fill(0, 140, LeadStatus::Dq),
            array_fill(0, 13, LeadStatus::Returned),
            array_fill(0, 25, LeadStatus::Converted),
            array_fill(0, 5, LeadStatus::Fake),
        );
        shuffle($statusesRest);

        $restCount = count($restIndices);
        $tfishInRest = max(0, self::TARGET_TFISH_TOTAL - self::FORCED_AG5_TFISH_DQ);
        $supplierCodesRest = $this->buildSupplierPoolForRest($restCount, $tfishInRest);

        $buyersRest = $this->buildRemainingBuyerPool();
        shuffle($buyersRest);

        $dispositions = $this->buildDispositionPool($faker);
        $injuries = $this->buildInjuryPool();

        $start = Carbon::create(2026, 4, 1, 0, 0, 0, 'UTC');
        $end = Carbon::create(2026, 4, 30, 23, 59, 59, 'UTC');

        $rows = array_fill(0, self::TOTAL_LEADS, null);

        foreach ($forcedIndices as $i) {
            $rows[$i] = $this->makeLeadRowSkeleton(
                $i,
                $faker,
                $start,
                $end,
                LeadStatus::Dq,
                $supplierIds['TFISH'],
                $buyerIds['AG5'],
                LeadVertical::MVA->value,
                $suppliers['TFISH']->default_lead_type,
            );
        }

        foreach ($restIndices as $k => $i) {
            $buyerCode = $buyersRest[$k];
            $supplierCode = $supplierCodesRest[$k];
            $buyer = $buyerModelsByCode->get($buyerCode);
            $rows[$i] = $this->makeLeadRowSkeleton(
                $i,
                $faker,
                $start,
                $end,
                $statusesRest[$k],
                $supplierIds[$supplierCode],
                $buyer?->id,
                $buyer
                    ? $buyer->vertical->value
                    : $faker->randomElement(['MVA', 'MVA', 'MVA', 'MVA', 'WC', 'Premise']),
                $suppliers[$supplierCode]->default_lead_type,
            );
        }

        foreach ($rows as &$row) {
            $row['injury_type'] = array_shift($injuries);
            $row['disposition'] = array_shift($dispositions);
            $row['phone_verification'] = $this->randomPhoneVerification(
                $faker,
                LeadStatus::from($row['status']),
            );
        }
        unset($row);

        $this->assignMoneyAndFlags($rows);

        foreach ($rows as &$r) {
            unset($r['_i']);
            $r['updated_at'] = $r['created_at'];
        }
        unset($r);

        foreach (array_chunk($rows, 400) as $chunk) {
            Lead::query()->insert($chunk);
        }
    }

    /**
     * @return list<string>
     */
    private function buildSupplierPoolForRest(int $restCount, int $tfishCount): array
    {
        $tfishCount = min($tfishCount, $restCount);
        $otherCount = $restCount - $tfishCount;

        $weights = [
            'LEADFLOW' => 83,
            'LGNX' => 64,
            'INBNDS-S' => 39,
            'CHECK-ACALL' => 6,
            'CHECK-MYC' => 4,
            'INBNDS-PVL' => 13,
        ];

        $allocated = $this->allocateCountsByWeight($otherCount, $weights);
        $pool = [];
        foreach ($allocated as $code => $n) {
            $pool = array_merge($pool, array_fill(0, $n, $code));
        }
        $pool = array_merge($pool, array_fill(0, $tfishCount, 'TFISH'));
        shuffle($pool);

        return $pool;
    }

    /**
     * @param  array<string, int>  $weights
     * @return array<string, int>
     */
    private function allocateCountsByWeight(int $total, array $weights): array
    {
        $sumW = array_sum($weights);
        $out = [];
        $remainders = [];
        foreach ($weights as $k => $w) {
            $exact = $total * ($w / $sumW);
            $out[$k] = (int) floor($exact);
            $remainders[$k] = $exact - $out[$k];
        }
        $diff = $total - array_sum($out);
        arsort($remainders);
        foreach (array_keys($remainders) as $k) {
            if ($diff <= 0) {
                break;
            }
            $out[$k]++;
            $diff--;
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private function buildRemainingBuyerPool(): array
    {
        return array_merge(
            array_fill(0, 92, 'AG1'),
            array_fill(0, 33, 'LF10'),
            array_fill(0, 34, 'NW4'),
            array_fill(0, 28, 'LF14'),
            array_fill(0, 30, 'LF22'),
            array_fill(0, 32, 'AG2'),
            array_fill(0, 25, 'LF2'),
            array_fill(0, 27, 'LF6'),
            array_fill(0, 28, 'LFWC9'),
            array_fill(0, 24, 'LF1'),
            array_fill(0, 26, 'NW2'),
            array_fill(0, 29, 'LF3'),
            array_fill(0, 22, 'WC3'),
            array_fill(0, 31, 'LF8'),
            array_fill(0, 20, 'T1'),
            array_fill(0, 19, 'AG1P'),
            array_fill(0, 16, 'AG5'),
            array_fill(0, 10, 'NW4'),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function makeLeadRowSkeleton(
        int $i,
        $faker,
        Carbon $start,
        Carbon $end,
        LeadStatus $status,
        int $supplierId,
        ?int $buyerId,
        string $vertical,
        ?string $defaultLeadType,
    ): array {
        return [
            '_i' => $i,
            'external_id' => (string) Str::ulid(),
            'vertical' => $vertical,
            'state' => $this->randomState($faker),
            'accident_date' => $faker->optional(0.65)->dateTimeBetween('-2 years', '-30 days')?->format('Y-m-d'),
            'accident_sol' => $faker->optional(0.4)->randomElement(['Within 7 Days', 'Within 3 Months', 'Within 1 Year', 'Outside SOL']),
            'treatment_time' => $faker->optional(0.35)->randomElement(['Within 7 Days', 'Within 30 Days', 'Within 60 Days', 'Unknown']),
            'injury_type' => null,
            'phone_verification' => null,
            'supplier_id' => $supplierId,
            'source' => $faker->randomElement(['Facebook', 'Google', 'Instagram', 'TFISH', 'Inbounds Calls']),
            'utm_source' => $faker->optional(0.45)->randomElement(['fb', 'ig', 'google', 'organic', 'email']),
            'lead_type' => $this->pickLeadType($vertical, $defaultLeadType, $faker),
            'status' => $status->value,
            'disposition' => null,
            'cost' => 0,
            'revenue' => 0,
            'ipl' => 0,
            'is_conversion' => false,
            'buyer_id' => $buyerId,
            'created_at' => Carbon::instance($faker->dateTimeBetween($start, $end)),
        ];
    }

    /**
     * @return array<string, Supplier>
     */
    private function seedSuppliers(): array
    {
        $defs = [
            ['TFISH', 'TFISH', 'MVA DQ Leads'],
            ['LEADFLOW', 'Leadflow', 'MVA Leads'],
            ['LGNX', 'Legenex', 'MVA Leads'],
            ['INBNDS-S', 'Inbounds Standard', 'MVA Calls'],
            ['CHECK-ACALL', 'Check A Call', 'MVA Leads'],
            ['CHECK-MYC', 'Check My C', 'MVA Leads'],
            ['INBNDS-PVL', 'Inbounds Premium', 'Premise'],
        ];

        $map = [];
        foreach ($defs as [$code, $name, $dlt]) {
            $map[$code] = Supplier::query()->updateOrCreate(
                ['supplier_code' => $code],
                ['name' => $name, 'default_lead_type' => $dlt, 'active' => true],
            );
        }

        return $map;
    }

    /**
     * @return array<string, Buyer>
     */
    private function seedBuyers(): array
    {
        $defs = [
            ['AG1', LeadVertical::MVA, 'AG1'],
            ['AG5', LeadVertical::MVA, 'AG5'],
            ['LF10', LeadVertical::MVA, 'LF10'],
            ['NW4', LeadVertical::MVA, 'NW4'],
            ['LF14', LeadVertical::MVA, 'LF14'],
            ['LF22', LeadVertical::MVA, 'LF22'],
            ['AG2', LeadVertical::MVA, 'AG2'],
            ['LF2', LeadVertical::MVA, 'LF2'],
            ['LF6', LeadVertical::MVA, 'LF6'],
            ['LFWC9', LeadVertical::WC, 'LFWC9'],
            ['LF1', LeadVertical::MVA, 'LF1'],
            ['NW2', LeadVertical::MVA, 'NW2'],
            ['LF3', LeadVertical::MVA, 'LF3'],
            ['WC3', LeadVertical::WC, 'WC3'],
            ['LF8', LeadVertical::MVA, 'LF8'],
            ['T1', LeadVertical::MVA, 'T1'],
            ['AG1P', LeadVertical::Premise, 'AG1 Premise'],
        ];

        $map = [];
        foreach ($defs as [$code, $vertical, $name]) {
            $map[$code] = Buyer::query()->updateOrCreate(
                ['buyer_code' => $code],
                ['vertical' => $vertical, 'name' => $name, 'active' => true],
            );
        }

        return $map;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function assignMoneyAndFlags(array &$rows): void
    {
        $totalCost = 0.0;
        $totalRevenue = 0.0;

        foreach ($rows as &$row) {
            $status = LeadStatus::from($row['status']);

            $baseCost = match ($status) {
                LeadStatus::Sold, LeadStatus::Converted => random_int(12000, 28000) / 100,
                LeadStatus::Unsold => random_int(4000, 14000) / 100,
                LeadStatus::Dq => random_int(800, 4500) / 100,
                LeadStatus::Returned => random_int(2000, 9000) / 100,
                LeadStatus::Fake => random_int(0, 800) / 100,
            };

            $baseRevenue = match ($status) {
                LeadStatus::Sold => random_int(22000, 52000) / 100,
                LeadStatus::Converted => random_int(28000, 65000) / 100,
                default => 0.0,
            };

            $row['cost'] = round($baseCost, 2);
            $row['revenue'] = round($baseRevenue, 2);
            $totalCost += $row['cost'];
            $totalRevenue += $row['revenue'];
        }
        unset($row);

        $costFactor = self::TARGET_COST / max($totalCost, 1);
        $revenueFactor = self::TARGET_REVENUE / max($totalRevenue, 1);

        foreach ($rows as &$row) {
            $row['cost'] = round((float) $row['cost'] * $costFactor, 2);
            $status = LeadStatus::from($row['status']);

            if ($status === LeadStatus::Sold || $status === LeadStatus::Converted) {
                $row['revenue'] = round((float) $row['revenue'] * $revenueFactor, 2);
            } else {
                $row['revenue'] = 0.0;
            }

            $disp = (string) ($row['disposition'] ?? '');
            $row['is_conversion'] = $status === LeadStatus::Converted
                || str_contains(strtolower($disp), 'converted');

            $row['ipl'] = round((float) $row['revenue'] - (float) $row['cost'], 2);
        }
        unset($row);
    }

    private function randomState($faker): string
    {
        $weights = [
            'CA' => 220, 'NC' => 95, 'FL' => 88, 'IL' => 72, 'MO' => 58,
            'IN' => 55, 'OH' => 52, 'NJ' => 48, 'NY' => 46, 'MD' => 42,
            'TX' => 35, 'PA' => 32, 'GA' => 28, 'MI' => 26, 'TN' => 24,
            'AZ' => 22, 'SC' => 20, 'VA' => 18, 'WA' => 16, 'CO' => 15,
            'WI' => 14, 'MN' => 12, 'AL' => 10, 'KY' => 10, 'LA' => 10,
            'OK' => 8, 'AR' => 8, 'MS' => 6, 'NV' => 6, 'OR' => 6,
            'CT' => 5, 'KS' => 5, 'IA' => 5, 'UT' => 5, 'WV' => 4,
        ];

        $pool = [];
        foreach ($weights as $st => $w) {
            $pool = array_merge($pool, array_fill(0, $w, $st));
        }

        return $faker->randomElement($pool);
    }

    private function randomPhoneVerification($faker, LeadStatus $status): ?string
    {
        if ($status === LeadStatus::Fake) {
            return $faker->optional(0.35)->randomElement(
                array_map(fn (PhoneVerification $p) => $p->value, PhoneVerification::cases()),
            );
        }

        return $faker->randomElement(
            array_map(fn (PhoneVerification $p) => $p->value, PhoneVerification::cases()),
        );
    }

    private function pickLeadType(string $vertical, ?string $default, $faker): string
    {
        if ($default) {
            return $default;
        }

        return match ($vertical) {
            'WC' => $faker->randomElement(['WC Leads', 'Calls']),
            'Premise' => 'Premise',
            default => $faker->randomElement(['MVA Leads', 'MVA Calls', 'MVA Unsold', 'MVA DQ Leads']),
        };
    }

    /**
     * @return list<string|null>
     */
    private function buildInjuryPool(): array
    {
        $pool = array_merge(
            array_fill(0, 191, 'Back Or Neck Pain'),
            array_fill(0, 106, 'Other'),
            array_fill(0, 777, null),
            array_fill(0, 26, 'Broken Bones'),
            array_fill(0, 20, 'Whiplash'),
            array_fill(0, 14, 'Cuts And Bruises'),
            array_fill(0, 12, 'No Injury'),
            array_fill(0, 9, 'Headaches'),
            array_fill(0, 8, 'Brain Injury'),
            array_fill(0, 5, 'Spinal Cord Injury'),
            array_fill(0, 2, 'Loss Of Life'),
        );
        shuffle($pool);

        return $pool;
    }

    /**
     * @return list<string|null>
     */
    private function buildDispositionPool($faker): array
    {
        $fixed = array_merge(
            array_fill(0, 111, 'Answering Machine'),
            array_fill(0, 9, 'Already Settled'),
            array_fill(0, 34, 'Converted'),
            array_fill(0, 30, 'DQ - Has Lawyer Filed'),
            array_fill(0, 33, 'DQ - No Injuries'),
            array_fill(0, 23, 'DQ - Outside SOL'),
            array_fill(0, 14, 'Chase'),
            array_fill(0, 22, 'Caller Hangup'),
        );

        $callbacks = [
            'Callback Requested',
            'Callback Scheduled',
            'Callback - Left Voicemail',
            'Callback - No Answer',
            'Callback - Busy',
            'Will Call Back',
            'Follow Up - Later Date',
            'Customer Requested Callback',
        ];

        $rest = self::TOTAL_LEADS - count($fixed);
        for ($i = 0; $i < $rest; $i++) {
            $fixed[] = $faker->randomElement($callbacks);
        }

        shuffle($fixed);

        return $fixed;
    }
}
