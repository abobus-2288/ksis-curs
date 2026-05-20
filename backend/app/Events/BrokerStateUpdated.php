<?php

namespace App\Events;

use App\Http\Resources\MessageResource;
use App\Http\Resources\QueueResource;
use App\Models\Queue;
use App\Services\Broker\QueueService;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Http\Request;
use Illuminate\Queue\SerializesModels;

class BrokerStateUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly string $queueName,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('broker');
    }

    public function broadcastAs(): string
    {
        return 'broker.state.updated';
    }

    public function broadcastWith(): array
    {
        $request = Request::create('/broadcasting/broker-state');
        $queueService = app(QueueService::class);
        $queues = $queueService->list();
        $queue = Queue::query()->where('name', $this->queueName)->first() ?? $queues->first();
        $messages = $queue
            ? $queue->messages()->latest()->limit(25)->get()
            : collect();

        return [
            'queue' => $this->queueName,
            'snapshot' => [
                'queues' => QueueResource::collection($queues)->resolve($request),
                'stats' => $queueService->stats(),
                'messages' => MessageResource::collection($messages)->resolve($request),
            ],
        ];
    }
}
