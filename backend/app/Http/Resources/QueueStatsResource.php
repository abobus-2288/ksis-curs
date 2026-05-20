<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QueueStatsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $messages = $this->resource['messages'] ?? [];
        $redis = $this->resource['redis'] ?? [];

        return [
            'total' => array_sum($messages),
            'pending' => (int) ($messages['pending'] ?? 0),
            'delayed' => (int) ($messages['delayed'] ?? 0),
            'processing' => (int) ($messages['processing'] ?? 0),
            'done' => (int) ($messages['done'] ?? 0),
            'failed' => (int) ($messages['failed'] ?? 0),
            'dead' => (int) ($messages['dead'] ?? 0),
            'redis' => [
                'ready' => (int) ($redis['ready'] ?? 0),
                'delayed' => (int) ($redis['delayed'] ?? 0),
                'processing' => (int) ($redis['processing'] ?? 0),
            ],
        ];
    }
}
