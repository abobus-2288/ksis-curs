<?php

namespace App\Http\Resources;

use App\Services\Broker\QueueService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QueueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $stats = app(QueueService::class)->statsForQueue($this->resource);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'status' => $this->status?->value ?? $this->status,
            'stats' => (new QueueStatsResource($stats))->toArray($request),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
