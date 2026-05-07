<?php

namespace App\Enums;

enum PhoneVerification: string
{
    case ExactMatch = 'Exact Match';
    case NoMatch = 'No Match';
    case PartialMatch = 'Partial Match';
    case MatchError = 'Match Error';
    case CallVerified = 'Call Verified';
    case Verified = 'Verified';
}
