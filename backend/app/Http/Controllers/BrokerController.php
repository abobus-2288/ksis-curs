<?php

namespace App\Http\Controllers;

use App\Services\Broker\MessageRecoveryService;
use App\Services\Broker\QueueService;
use Illuminate\Http\JsonResponse;

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
}
