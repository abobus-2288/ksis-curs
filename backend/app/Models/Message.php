<?php

namespace App\Models;

use App\Enum\MessageStatuses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'queue_id',
        'payload',
        'priority',
        'status',
        'attempts',
        'max_attempts',
        'available_at',
        'reserved_until',
        'consumer_id',
        'ack_token_hash',
        'result',
        'error',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'result' => 'array',
            'status' => MessageStatuses::class,
            'available_at' => 'datetime',
            'reserved_until' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function queue(): BelongsTo
    {
        return $this->belongsTo(Queue::class);
    }
}
