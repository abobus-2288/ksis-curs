<?php

namespace App\Http\Controllers;

use App\Http\Requests\AckMessageRequest;
use App\Http\Requests\ConsumeMessageRequest;
use App\Http\Requests\NackMessageRequest;
use App\Http\Requests\PublishMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Message;
use App\Models\Queue;
use App\Services\Broker\MessageAckService;
use App\Services\Broker\MessageConsumeService;
use App\Services\Broker\MessagePublishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class MessageController extends Controller
{
    public function index(Request $request, Queue $queue)
    {
        $messages = $queue->messages()
            ->when($request->query('status'), fn ($query, string $status) => $query->where('status', $status))
            ->when($request->query('priority'), fn ($query, string $priority) => $query->where('priority', $priority))
            ->latest()
            ->paginate((int) $request->query('per_page', 25));

        return MessageResource::collection($messages);
    }

    public function store(PublishMessageRequest $request, Queue $queue, MessagePublishService $publishService): MessageResource
    {
        return new MessageResource($publishService->publish($queue, $request->validated()));
    }

    public function consume(ConsumeMessageRequest $request, Queue $queue, MessageConsumeService $consumeService): JsonResponse
    {
        try {
            $result = $consumeService->consume($queue, $request->validated());
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 409);
        }

        if ($result === null) {
            return response()->json([
                'data' => [
                    'message' => null,
                    'ack_token' => null,
                    'empty' => true,
                ],
                'message' => 'No messages available.',
            ], 200);
        }

        return response()->json([
            'data' => [
                'message' => (new MessageResource($result['message']))->toArray($request),
                'ack_token' => $result['ack_token'],
                'empty' => false,
            ],
        ]);
    }

    public function ack(AckMessageRequest $request, Message $message, MessageAckService $ackService): MessageResource|JsonResponse
    {
        try {
            return new MessageResource($ackService->ack($message, $request->validated()));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 409);
        }
    }

    public function nack(NackMessageRequest $request, Message $message, MessageAckService $ackService): MessageResource|JsonResponse
    {
        try {
            return new MessageResource($ackService->nack($message, $request->validated()));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 409);
        }
    }
}
