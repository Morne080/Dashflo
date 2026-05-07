<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Twilio Lookup
    |--------------------------------------------------------------------------
    */
    'twilio' => [
        'lookup_base_url' => 'https://lookups.twilio.com/v1/PhoneNumbers',
        'timeout_seconds' => (int) env('TWILIO_LOOKUP_TIMEOUT', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | ActiveProspect TrustedForm (Retain / certificate operations)
    |--------------------------------------------------------------------------
    | Set TRUSTEDFORM_RETAIN_URL to the endpoint your ActiveProspect plan uses.
    | Many integrations POST JSON: { "certificate_url": "https://cert.trustedform.com/..." }.
    */
    'trustedform' => [
        'retain_url' => env('TRUSTEDFORM_RETAIN_URL', 'https://api.trustedform.com/v4/certificates/retain'),
        'timeout_seconds' => (int) env('TRUSTEDFORM_TIMEOUT', 20),
    ],

];
