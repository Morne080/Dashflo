<?php

namespace App\Services\LeadVerification;

use App\Models\IntegrationFact;
use App\Models\IntegrationSource;

final class LeadVerificationOrchestrator
{
    public function __construct(
        private readonly TwilioPhoneLookupClient $twilio,
        private readonly EmailLegitimacyVerifier $emailVerifier,
        private readonly TrustedFormRetainClient $trustedForm,
    ) {}

    /**
     * Runs enabled verifications for a fact and persists the `verifications` JSON column.
     */
    public function run(IntegrationFact $fact): void
    {
        $source = $fact->integrationSource;
        if (! $source instanceof IntegrationSource) {
            return;
        }

        $cfg = $source->verificationSettings();
        $out = is_array($fact->verifications) ? $fact->verifications : [];

        $out['twilio_lookup'] = $this->runTwilio($fact, $source, $cfg['twilio_lookup'] ?? []);
        $out['email_verification'] = $this->runEmail($fact, $cfg['email_verification'] ?? []);
        $out['trustedform'] = $this->runTrustedForm($fact, $source, $cfg['trustedform'] ?? []);

        $fact->verifications = $out;
        $fact->save();
    }

    /**
     * @param  array<string, mixed>  $twilioCfg
     * @return array<string, mixed>
     */
    private function runTwilio(IntegrationFact $fact, IntegrationSource $source, array $twilioCfg): array
    {
        if (! ($twilioCfg['enabled'] ?? false)) {
            return ['skipped' => true, 'reason' => 'disabled'];
        }

        $creds = $source->effectiveTwilioCredentials();
        if ($creds === null) {
            return ['skipped' => true, 'reason' => 'missing_credentials'];
        }

        $raw = LeadPayloadExtractor::firstPhone($fact, $source);
        if ($raw === null) {
            return ['skipped' => true, 'reason' => 'no_phone_in_payload'];
        }

        $e164 = LeadPayloadExtractor::normalizePhoneForLookup($raw);
        if ($e164 === null) {
            return ['skipped' => true, 'reason' => 'phone_not_normalizable', 'raw' => $raw];
        }

        $result = $this->twilio->lookup($e164, $creds['account_sid'], $creds['auth_token']);

        return [
            'skipped' => false,
            'input_raw' => $raw,
            'input_e164' => $e164,
            'ok' => $result['ok'],
            'http_status' => $result['http_status'],
            'twilio' => $result['data'],
            'error' => $result['error'],
        ];
    }

    /**
     * @param  array<string, mixed>  $emailCfg
     * @return array<string, mixed>
     */
    private function runEmail(IntegrationFact $fact, array $emailCfg): array
    {
        if (! ($emailCfg['enabled'] ?? false)) {
            return ['skipped' => true, 'reason' => 'disabled'];
        }

        $email = LeadPayloadExtractor::firstEmail($fact, $source);
        if ($email === null) {
            return ['skipped' => true, 'reason' => 'no_email_in_payload'];
        }

        $r = $this->emailVerifier->verify($email);

        return [
            'skipped' => false,
            'email' => $email,
            'ok' => $r['ok'],
            'syntax_ok' => $r['syntax_ok'],
            'mx_ok' => $r['mx_ok'],
            'error' => $r['error'],
        ];
    }

    /**
     * @param  array<string, mixed>  $tfCfg
     * @return array<string, mixed>
     */
    private function runTrustedForm(IntegrationFact $fact, IntegrationSource $source, array $tfCfg): array
    {
        if (! ($tfCfg['enabled'] ?? false)) {
            return ['skipped' => true, 'reason' => 'disabled'];
        }

        $apiKey = $source->effectiveTrustedFormApiKey();
        if ($apiKey === null || $apiKey === '') {
            return ['skipped' => true, 'reason' => 'missing_api_key'];
        }

        $certUrl = LeadPayloadExtractor::firstTrustedFormCertificateUrl($fact, $source);
        if ($certUrl === null) {
            return ['skipped' => true, 'reason' => 'no_certificate_url_in_payload'];
        }

        $result = $this->trustedForm->retainCertificate($certUrl, $apiKey);

        return [
            'skipped' => false,
            'certificate_url' => $certUrl,
            'ok' => $result['ok'],
            'http_status' => $result['http_status'],
            'response' => $result['data'],
            'error' => $result['error'],
        ];
    }
}
