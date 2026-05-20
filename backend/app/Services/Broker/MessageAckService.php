<?php

namespace App\Services\Broker;

use App\Enum\MessageStatuses;
use App\Models\Message;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MessageAckService
{
    public function __construct(private readonly RedisBroker $redisBroker) {}

    public function ack(Message $message, array $data): Message
    {
        return $this->withValidToken($message, $data['ack_token'], function (Message $message) use ($data): Message {
            $message->update([
                'status' => MessageStatuses::DONE,
                'result' => $data['result'] ?? null,
                'reserved_until' => null,
                'ack_token_hash' => null,
                'completed_at' => now(),
            ]);

            return $message->refresh();
        });
    }

    public function nack(Message $message, array $data): Message
    {
        return $this->withValidToken($message, $data['ack_token'], function (Message $message) use ($data): Message {
            $queue = $message->queue;
            $requeue = (bool) ($data['requeue'] ?? true);
            $hasAttemptsLeft = $message->attempts < $message->max_attempts;

            if ($requeue && $hasAttemptsLeft) {
                $message->update([
                    'status' => MessageStatuses::FAILED,
                    'error' => $data['error'] ?? null,
                    'reserved_until' => null,
                    'ack_token_hash' => null,
                    'consumer_id' => null,
                    'available_at' => now(),
                ]);
                $this->redisBroker->enqueueReady($queue->name, $message->id, $message->priority);
            } else {
                $message->update([
                    'status' => MessageStatuses::DEAD,
                    'error' => $data['error'] ?? null,
                    'reserved_until' => null,
                    'ack_token_hash' => null,
                    'completed_at' => now(),
                ]);
            }

            return $message->refresh();
        });
    }

    private function withValidToken(Message $message, string $ackToken, callable $callback): Message
    {
        return DB::transaction(function () use ($message, $ackToken, $callback): Message {
            $message = Message::query()->whereKey($message->id)->lockForUpdate()->firstOrFail();

            if ($message->status !== MessageStatuses::PROCESSING) {
                throw new RuntimeException('Message is not processing.');
            }

            $redisToken = $this->redisBroker->getAckToken($message->id);
            $isValid = $redisToken !== null
                && hash_equals($redisToken, $ackToken)
                && hash_equals((string) $message->ack_token_hash, hash('sha256', $ackToken));

            if (! $isValid) {
                throw new RuntimeException('Invalid or expired ack token.');
            }

            $this->redisBroker->removeProcessing($message->queue->name, $message->id);
            $this->redisBroker->deleteAckToken($message->id);

            return $callback($message);
        });
    }
}
