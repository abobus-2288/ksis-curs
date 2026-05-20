<?php

namespace App\Services\Broker;

use App\Models\Queue;
use Illuminate\Support\Facades\Redis;

class RedisBroker
{
    public const PRIORITIES = ['high', 'normal', 'low'];

    public function registerQueue(Queue $queue): void
    {
        Redis::sadd($this->queuesKey(), $queue->name);
    }

    public function unregisterQueue(string $queueName): void
    {
        Redis::srem($this->queuesKey(), $queueName);
        Redis::del($this->delayedKey($queueName));
        Redis::del($this->processingKey($queueName));

        foreach (self::PRIORITIES as $priority) {
            Redis::del($this->readyKey($queueName, $priority));
        }
    }

    public function enqueueReady(string $queueName, int $messageId, string $priority = 'normal'): void
    {
        Redis::lpush($this->readyKey($queueName, $priority), (string) $messageId);
    }

    public function enqueueDelayed(string $queueName, int $messageId, int $availableAt): void
    {
        Redis::zadd($this->delayedKey($queueName), $availableAt, (string) $messageId);
    }

    public function consumeNext(string $queueName, int $deadline): ?int
    {
        $readyKeys = array_map(
            fn (string $priority): string => $this->readyKey($queueName, $priority),
            self::PRIORITIES,
        );
        $keys = [...$readyKeys, $this->processingKey($queueName)];
        $script = <<<'LUA'
for index = 1, #KEYS - 1 do
    local message_id = redis.call('RPOP', KEYS[index])
    if message_id then
        redis.call('ZADD', KEYS[#KEYS], ARGV[1], message_id)
        return message_id
    end
end

return nil
LUA;

        $messageId = Redis::command('eval', [$script, count($keys), ...$keys, (string) $deadline]);

        return $messageId === null ? null : (int) $messageId;
    }

    public function markProcessing(string $queueName, int $messageId, int $deadline): void
    {
        Redis::zadd($this->processingKey($queueName), $deadline, (string) $messageId);
    }

    public function removeProcessing(string $queueName, int $messageId): void
    {
        Redis::zrem($this->processingKey($queueName), (string) $messageId);
    }

    public function removeDelayed(string $queueName, int $messageId): void
    {
        Redis::zrem($this->delayedKey($queueName), (string) $messageId);
    }

    public function dueDelayed(string $queueName, int $now, int $limit = 100): array
    {
        return array_map('intval', Redis::zrangebyscore($this->delayedKey($queueName), '-inf', $now, ['limit' => [0, $limit]]));
    }

    public function expiredProcessing(string $queueName, int $now, int $limit = 100): array
    {
        return array_map('intval', Redis::zrangebyscore($this->processingKey($queueName), '-inf', $now, ['limit' => [0, $limit]]));
    }

    public function setAckToken(int $messageId, string $token, int $ttl): void
    {
        Redis::setex($this->tokenKey($messageId), $ttl, $token);
    }

    public function getAckToken(int $messageId): ?string
    {
        return Redis::get($this->tokenKey($messageId));
    }

    public function deleteAckToken(int $messageId): void
    {
        Redis::del($this->tokenKey($messageId));
    }

    public function readyCount(string $queueName): int
    {
        return array_sum(array_map(
            fn (string $priority): int => (int) Redis::llen($this->readyKey($queueName, $priority)),
            self::PRIORITIES,
        ));
    }

    public function delayedCount(string $queueName): int
    {
        return (int) Redis::zcard($this->delayedKey($queueName));
    }

    public function processingCount(string $queueName): int
    {
        return (int) Redis::zcard($this->processingKey($queueName));
    }

    private function queuesKey(): string
    {
        return 'broker:queues';
    }

    private function readyKey(string $queueName, string $priority): string
    {
        return "broker:queue:{$queueName}:ready:{$priority}";
    }

    private function delayedKey(string $queueName): string
    {
        return "broker:queue:{$queueName}:delayed";
    }

    private function processingKey(string $queueName): string
    {
        return "broker:queue:{$queueName}:processing";
    }

    private function tokenKey(int $messageId): string
    {
        return "broker:message:{$messageId}:token";
    }
}
