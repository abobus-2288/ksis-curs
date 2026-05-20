<?php

namespace App\Enum;

enum MessageStatuses: string
{
    case PENDING = 'pending';
    case DELAYED = 'delayed';
    case PROCESSING = 'processing';
    case DONE = 'done';
    case FAILED = 'failed';
    case DEAD = 'dead';
}
