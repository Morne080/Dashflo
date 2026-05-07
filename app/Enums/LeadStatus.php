<?php

namespace App\Enums;

enum LeadStatus: string
{
    case Sold = 'sold';
    case Unsold = 'unsold';
    case Returned = 'returned';
    case Dq = 'dq';
    case Fake = 'fake';
    case Converted = 'converted';
}
