<?php

namespace App\Services\LeadVerification;

use Illuminate\Support\Facades\Http;
use Throwable;

final class TwilioPhoneLookupClient
{
    /**
     * @return array{ok: bool, http_status: int|null, data: array<string, mixed>|null, error: string|null}
     */
    public function lookup(string $e164Phone, string $accountSid, string $authToken): array
    {
        $base = rtrim((string) config('lead_verification.twilio.lookup_base_url'), '/');
        $url = $base.'/'.rawurlencode($e164Phone).'.json';
        $timeout = (int) config('lead_verification.twilio.timeout_seconds', 15);

        try {
            $response = Http::withBasicAuth($accountSid, $authToken)
                ->acceptJson()
                ->timeout($timeout)
                ->get($url);

            if ($response->successful()) {
                return [
                    'ok' => true,
                    'http_status' => $response->status(),
                    'data' => $response->json() ?? [],
                    'error' => null,
                ];
            }

            return [
                'ok' => false,
                'http_status' => $response->status(),
                'data' => $response->json() ?? null,
                'error' => 'Twilio Lookup HTTP '.$response->status(),
            ];
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'http_status' => null,
                'data' => null,
                'error' => $e->getMessage(),
            ];
        }
    }
}
