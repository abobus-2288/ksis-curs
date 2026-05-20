<?php

namespace App\Services\Broker;

use App\Enum\MessageStatuses;
use App\Enum\QueueStatuses;
use App\Models\Message;
use App\Models\Queue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class QueueService
{
    public function __construct(
        private readonly RedisBroker $redisBroker,
        private readonly MessageRecoveryService $recoveryService,
    ) {}

    public function list(): Collection
    {
        $queues = Queue::query()->orderBy('name')->get();
        $queues->each(fn (Queue $queue) => $this->recoveryService->recoverQueue($queue));

        return $queues;
    }

    public function create(array $data): Queue
    {
        return DB::transaction(function () use ($data): Queue {
            $queue = Queue::query()->create([
                'name' => $data['name'],
                'status' => QueueStatuses::ACTIVE,
            ]);

            $this->redisBroker->registerQueue($queue);

            return $queue;
        });
    }

    public function update(Queue $queue, array $data): Queue
    {
        if (array_key_exists('paused', $data)) {
            $data['status'] = $data['paused'] ? QueueStatuses::PAUSED->value : QueueStatuses::ACTIVE->value;
        }

        if (isset($data['status'])) {
            $queue->status = QueueStatuses::from($data['status']);
            $queue->save();
        }

        return $queue->refresh();
    }

    public function delete(Queue $queue, bool $force = false): void
    {
        if (! $force && $queue->messages()->exists()) {
            throw new InvalidArgumentException('Queue is not empty. Pass force=true to delete it.');
        }

        DB::transaction(function () use ($queue): void {
            $queueName = $queue->name;
            $queue->delete();
            $this->redisBroker->unregisterQueue($queueName);
        });
    }

    public function stats(?Queue $queue = null): array
    {
        if ($queue) {
            $this->recoveryService->recoverQueue($queue);

            return $this->statsForQueue($queue);
        }

        $this->recoveryService->recoverAll();

        return [
            'queues' => Queue::query()->count(),
            'total' => Message::query()->count(),
            'pending' => Message::query()->where('status', MessageStatuses::PENDING)->count(),
            'delayed' => Message::query()->where('status', MessageStatuses::DELAYED)->count(),
            'processing' => Message::query()->where('status', MessageStatuses::PROCESSING)->count(),
            'done' => Message::query()->where('status', MessageStatuses::DONE)->count(),
            'failed' => Message::query()->where('status', MessageStatuses::FAILED)->count(),
            'dead' => Message::query()->where('status', MessageStatuses::DEAD)->count(),
        ];
    }

    public function statsForQueue(Queue $queue): array
    {
        $statusCounts = $queue->messages()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return [
            'queue' => $queue,
            'redis' => [
                'ready' => $this->redisBroker->readyCount($queue->name),
                'delayed' => $this->redisBroker->delayedCount($queue->name),
                'processing' => $this->redisBroker->processingCount($queue->name),
            ],
            'messages' => collect(MessageStatuses::cases())
                ->mapWithKeys(fn (MessageStatuses $status): array => [$status->value => (int) ($statusCounts[$status->value] ?? 0)])
                ->all(),
        ];
    }
}
