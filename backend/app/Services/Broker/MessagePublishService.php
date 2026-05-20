<?php

namespace App\Services\Broker;

use App\Enum\MessageStatuses;
use App\Events\BrokerStateUpdated;
use App\Models\Message;
use App\Models\Queue;
use Illuminate\Support\Facades\DB;

class MessagePublishService
{
    public function __construct(
        private readonly RedisBroker $redisBroker,
        private readonly MessageRecoveryService $recoveryService,
    ) {}

    public function publish(Queue $queue, array $data): Message
    {
        $this->recoveryService->recoverQueue($queue);

        return DB::transaction(function () use ($queue, $data): Message {
            $delaySeconds = (int) ($data['delay_seconds'] ?? 0);
            $availableAt = $delaySeconds > 0 ? now()->addSeconds($delaySeconds) : now();
            $status = $delaySeconds > 0 ? MessageStatuses::DELAYED : MessageStatuses::PENDING;

            $message = $queue->messages()->create([
                'payload' => $data['payload'],
                'priority' => $data['priority'] ?? 'normal',
                'status' => $status,
                'attempts' => 0,
                'max_attempts' => $data['max_attempts'] ?? 3,
                'available_at' => $availableAt,
            ]);

            if ($status === MessageStatuses::DELAYED) {
                $this->redisBroker->enqueueDelayed($queue->name, $message->id, $availableAt->timestamp);
            } else {
                $this->redisBroker->enqueueReady($queue->name, $message->id, $message->priority);
            }

            event(new BrokerStateUpdated($queue->name));

            return $message;
        });
    }
}
