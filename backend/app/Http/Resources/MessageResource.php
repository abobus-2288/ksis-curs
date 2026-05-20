<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'queue_id' => $this->queue_id,
            'queue_name' => $this->whenLoaded('queue', fn () => $this->queue->name, $this->queue?->name),
            'payload' => $this->payload,
            'status' => $this->status?->value ?? $this->status,
            'priority' => $this->priority,
            'attempts' => $this->attempts,
            'max_attempts' => $this->max_attempts,
            'available_at' => $this->available_at?->toISOString(),
            'reserved_until' => $this->reserved_until?->toISOString(),
            'consumer_id' => $this->consumer_id,
            'result' => $this->result,
            'error' => $this->error,
            'completed_at' => $this->completed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
