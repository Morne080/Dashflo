<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Maximum upload size (kilobytes)
    |--------------------------------------------------------------------------
    |
    | Laravel's "max" file rule is in kilobytes. Ensure PHP post_max_size and
    | upload_max_filesize are at least this large (e.g. 205M for 204800 KB).
    |
    */
    'max_upload_kb' => (int) env('LEAD_IMPORT_MAX_UPLOAD_KB', 204800),

    /*
    |--------------------------------------------------------------------------
    | Maximum rows per file
    |--------------------------------------------------------------------------
    */
    'max_rows' => (int) env('LEAD_IMPORT_MAX_ROWS', 250_000),

    /*
    |--------------------------------------------------------------------------
    | Bulk insert chunk size
    |--------------------------------------------------------------------------
    |
    | Larger chunks are faster but use more memory per INSERT.
    |
    */
    'insert_chunk_size' => max(1, (int) env('LEAD_IMPORT_INSERT_CHUNK_SIZE', 1000)),

    /*
    |--------------------------------------------------------------------------
    | Queue verification after this many facts
    |--------------------------------------------------------------------------
    |
    | Imports at or above this size dispatch VerifyIntegrationFactsForEvent to
    | the queue instead of running synchronously (avoids HTTP timeouts).
    | Requires a running queue worker unless QUEUE_CONNECTION=sync.
    |
    */
    'async_verification_after_facts' => (int) env('LEAD_IMPORT_ASYNC_VERIFICATION_AFTER_FACTS', 2000),

    /*
    |--------------------------------------------------------------------------
    | Max execution time for this request (seconds)
    |--------------------------------------------------------------------------
    |
    | 0 means unlimited (PHP set_time_limit(0)).
    |
    */
    'max_execution_time' => (int) env('LEAD_IMPORT_MAX_EXECUTION_TIME', 0),

    /*
    |--------------------------------------------------------------------------
    | Chunked upload (many small POSTs)
    |--------------------------------------------------------------------------
    |
    | Files larger than chunked_upload_threshold_kb use multi-part uploads so
    | each request stays under PHP post_max_size. chunk_upload_kb is the max
    | size of each chunk (Laravel "max" rule = kilobytes).
    |
    */
    'chunked_upload_threshold_kb' => max(1, (int) env('LEAD_IMPORT_CHUNKED_THRESHOLD_KB', 1024)),

    /* Keep below PHP post_max_size (multipart adds a small overhead). */
    'chunk_upload_kb' => max(256, (int) env('LEAD_IMPORT_CHUNK_UPLOAD_KB', 2048)),

    'chunk_session_ttl_seconds' => max(300, (int) env('LEAD_IMPORT_CHUNK_SESSION_TTL', 86_400)),

];
