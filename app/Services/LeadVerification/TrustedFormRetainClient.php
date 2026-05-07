<?php

namespace App\Services\LeadVerification;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Calls ActiveProspect TrustedForm retain-style endpoint (URL configurable).
 *
 * Configure TRUSTEDFORM_RETAIN_URL to match your ActiveProspect / LeadConduit integration.
 * Default body: { "certificate_url": "https://cert.trustedform.com/..." } with Bearer API key.
 */
final class TrustedFormRetainClient
{
    /**
     * @return array{ok: bool, http_status: int|null, data: array<string, mixed>|null, error: string|null}
     */
    public function retainCertificate(string $certificateUrl, string $apiKey): array
    {
        $endpoint = (string) config('lead_verification.trustedform.retain_url');
        $timeout = (int) config('lead_verification.trustedform.timeout_seconds', 20);

        if ($endpoint === '' || $apiKey === '') {
            return [
                'ok' => false,
                'http_status' => null,
                'data' => null,
                'error' => 'TrustedForm endpoint or API key not configured.',
            ];
        }

        try {
            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout($timeout)
                ->post($endpoint, [
                    'certificate_url' => $certificateUrl,
                ]);

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
                'error' => 'TrustedForm HTTP '.$response->status(),
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
