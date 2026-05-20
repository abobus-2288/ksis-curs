<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class BaseController extends Controller
{
    private function normalizeResponse($data, string $message, int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'message' => $message,
        ], $status);
    }

    public function respError(\Exception $exception, $status = 500)
    {
        return $this->normalizeResponse($exception->getMessage(), 'Error', $status);
    }

    public function respSuccess($data)
    {
        return $this->normalizeResponse($data, 'Ok');
    }
}
