<?php

namespace App\Http\Controllers;

use App\Http\Resources\MessageResource;
use App\Http\Resources\QueueResource;
use App\Models\Queue;
use App\Services\Broker\MessageRecoveryService;
use App\Services\Broker\QueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrokerController extends Controller
{
    public function recover(MessageRecoveryService $recoveryService): JsonResponse
    {
        return response()->json(['data' => $recoveryService->recoverAll()]);
    }

    public function stats(QueueService $queueService): JsonResponse
    {
        return response()->json(['data' => $queueService->stats()]);
    }

    public function dashboard(Request $request, QueueService $queueService): JsonResponse
    {
        $queues = $queueService->list();
        $queueName = $request->query('queue') ?: $queues->first()?->name;
        $queue = $queueName ? Queue::query()->where('name', $queueName)->first() : null;

        $messages = $queue
            ? $queue->messages()
                ->when($request->query('status'), fn ($query, string $status) => $query->where('status', $status))
                ->when($request->query('priority'), fn ($query, string $priority) => $query->where('priority', $priority))
                ->latest()
                ->limit(25)
                ->get()
            : collect();

        return response()->json([
            'data' => [
                'queues' => QueueResource::collection($queues)->resolve($request),
                'stats' => $queueService->stats(),
                'messages' => MessageResource::collection($messages)->resolve($request),
            ],
        ]);
    }
}
