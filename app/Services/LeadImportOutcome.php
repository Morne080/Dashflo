<?php

namespace App\Services;

final readonly class LeadImportOutcome
{
    public function __construct(
        public int $created,
        public int $eventId,
    ) {}
}
