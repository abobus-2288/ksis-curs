<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Internal Framework Queue Connection
    |--------------------------------------------------------------------------
    |
    | Message broker processing must not use Laravel Queues, Jobs, Horizon, or
    | queue workers. This sync connection is only kept for framework internals
    | and accidental dispatches during development.
    |
    */

    'default' => env('QUEUE_CONNECTION', 'sync'),

    'connections' => [
        'sync' => [
            'driver' => 'sync',
        ],
    ],
    'failed' => [
        'driver' => env('QUEUE_FAILED_DRIVER', 'null'),
    ],

];
