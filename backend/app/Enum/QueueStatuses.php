<?php

namespace App\Enum;

enum QueueStatuses: string
{
    case ACTIVE = 'active';
    case PAUSED = 'paused';
}
