<?php

namespace App\Services\Broker;

use App\Enum\MessageStatuses;
use App\Enum\QueueStatuses;
use App\Models\Message;
use App\Models\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class MessageConsumeService
{
    public function __construct(
        private readonly RedisBroker $redisBroker,
        private readonly MessageRecoveryService $recoveryService,
    ) {}

    public function consume(Queue $queue, array $data): ?array
    {
        if ($queue->status !== QueueStatuses::ACTIVE) {
            throw new RuntimeException('Queue is paused.');
        }

        $this->recoveryService->recoverQueue($queue);

        $visibilityTimeout = (int) ($data['visibility_timeout'] ?? 60);
        $reservedUntil = now()->addSeconds($visibilityTimeout);
        $messageId = $this->redisBroker->consumeNext($queue->name, $reservedUntil->timestamp);

        if ($messageId === null) {
            return null;
        }

        return DB::transaction(function () use ($queue, $data, $messageId, $reservedUntil, $visibilityTimeout): ?array {
            $message = Message::query()
                ->whereKey($messageId)
                ->where('queue_id', $queue->id)
                ->lockForUpdate()
                ->first();

            if (! $message || ! in_array($message->status, [MessageStatuses::PENDING, MessageStatuses::FAILED], false)) {
                $this->redisBroker->removeProcessing($queue->name, $messageId);

                return null;
            }

            $ackToken = Str::random(48);
            $message->update([
                'status' => MessageStatuses::PROCESSING,
                'attempts' => $message->attempts + 1,
                'consumer_id' => $data['consumer_id'],
                'reserved_until' => $reservedUntil,
                'ack_token_hash' => hash('sha256', $ackToken),
                'error' => null,
            ]);
            $this->redisBroker->setAckToken($message->id, $ackToken, $visibilityTimeout + 60);

            return [
                'message' => $message->refresh(),
                'ack_token' => $ackToken,
            ];
        });
    }
}
