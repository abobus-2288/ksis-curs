<?php

namespace App\Services\Broker;

use App\Enum\MessageStatuses;
use App\Models\Message;
use App\Models\Queue;
use Illuminate\Support\Carbon;

class MessageRecoveryService
{
    public function __construct(private readonly RedisBroker $redisBroker) {}

    public function recoverQueue(Queue $queue, int $limit = 100): array
    {
        $now = now();
        $timestamp = $now->timestamp;
        $delayed = $this->recoverDelayed($queue, $timestamp, $limit);
        $expired = $this->recoverExpiredProcessing($queue, $now, $limit);

        return [
            'delayed' => $delayed,
            'expired' => $expired,
            'total' => $delayed + $expired,
        ];
    }

    public function recoverAll(int $limit = 100): array
    {
        $summary = ['delayed' => 0, 'expired' => 0, 'total' => 0];

        Queue::query()->each(function (Queue $queue) use (&$summary, $limit): void {
            $queueSummary = $this->recoverQueue($queue, $limit);
            $summary['delayed'] += $queueSummary['delayed'];
            $summary['expired'] += $queueSummary['expired'];
            $summary['total'] += $queueSummary['total'];
        });

        return $summary;
    }

    private function recoverDelayed(Queue $queue, int $timestamp, int $limit): int
    {
        $messageIds = $this->redisBroker->dueDelayed($queue->name, $timestamp, $limit);
        $count = 0;

        foreach ($messageIds as $messageId) {
            $message = Message::query()->whereKey($messageId)->where('status', MessageStatuses::DELAYED)->first();
            $this->redisBroker->removeDelayed($queue->name, $messageId);

            if (! $message) {
                continue;
            }

            $message->update([
                'status' => MessageStatuses::PENDING,
                'available_at' => now(),
            ]);
            $this->redisBroker->enqueueReady($queue->name, $message->id, $message->priority);
            $count++;
        }

        return $count;
    }

    private function recoverExpiredProcessing(Queue $queue, Carbon $now, int $limit): int
    {
        $messageIds = $this->redisBroker->expiredProcessing($queue->name, $now->timestamp, $limit);
        $count = 0;

        foreach ($messageIds as $messageId) {
            $message = Message::query()->whereKey($messageId)->where('status', MessageStatuses::PROCESSING)->first();
            $this->redisBroker->removeProcessing($queue->name, $messageId);
            $this->redisBroker->deleteAckToken($messageId);

            if (! $message) {
                continue;
            }

            if ($message->attempts >= $message->max_attempts) {
                $message->update([
                    'status' => MessageStatuses::DEAD,
                    'reserved_until' => null,
                    'ack_token_hash' => null,
                    'consumer_id' => null,
                    'error' => $message->error ?: 'Visibility timeout expired after max attempts.',
                    'completed_at' => now(),
                ]);
            } else {
                $message->update([
                    'status' => MessageStatuses::PENDING,
                    'reserved_until' => null,
                    'ack_token_hash' => null,
                    'consumer_id' => null,
                    'available_at' => now(),
                ]);
                $this->redisBroker->enqueueReady($queue->name, $message->id, $message->priority);
            }

            $count++;
        }

        return $count;
    }
}
