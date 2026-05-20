<?php

use App\Http\Controllers\BrokerController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\QueueController;
use Illuminate\Support\Facades\Route;

Route::get('/queues', [QueueController::class, 'index']);
Route::post('/queues', [QueueController::class, 'store']);
Route::get('/queues/{queue:name}', [QueueController::class, 'show']);
Route::patch('/queues/{queue:name}', [QueueController::class, 'update']);
Route::delete('/queues/{queue:name}', [QueueController::class, 'destroy']);

Route::get('/queues/{queue:name}/messages', [MessageController::class, 'index']);
Route::post('/queues/{queue:name}/messages', [MessageController::class, 'store']);
Route::post('/queues/{queue:name}/messages/consume', [MessageController::class, 'consume']);
Route::post('/messages/{message}/ack', [MessageController::class, 'ack']);
Route::post('/messages/{message}/nack', [MessageController::class, 'nack']);

Route::post('/broker/recover', [BrokerController::class, 'recover']);
Route::get('/broker/stats', [BrokerController::class, 'stats']);
