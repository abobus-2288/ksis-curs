<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateQueueRequest;
use App\Http\Requests\UpdateQueueRequest;
use App\Http\Resources\QueueResource;
use App\Models\Queue;
use App\Services\Broker\QueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class QueueController extends Controller
{
    public function __construct(private readonly QueueService $queueService) {}

    public function index()
    {
        return QueueResource::collection($this->queueService->list());
    }

    public function store(CreateQueueRequest $request): QueueResource
    {
        return new QueueResource($this->queueService->create($request->validated()));
    }

    public function show(Queue $queue): QueueResource
    {
        return new QueueResource($queue);
    }

    public function update(UpdateQueueRequest $request, Queue $queue): QueueResource
    {
        return new QueueResource($this->queueService->update($queue, $request->validated()));
    }

    public function destroy(Request $request, Queue $queue): JsonResponse
    {
        try {
            $this->queueService->delete($queue, $request->boolean('force'));
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(status: 204);
    }
}
