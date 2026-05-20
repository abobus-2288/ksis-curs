<?php

namespace Tests\Feature;

use App\Enum\MessageStatuses;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class BrokerApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Redis::flushdb();
    }

    public function test_publish_without_delay_creates_ready_message(): void
    {
        $this->postJson('/api/queues', ['name' => 'emails'])->assertCreated();

        $response = $this->postJson('/api/queues/emails/messages', [
            'payload' => ['type' => 'welcome'],
            'priority' => 'high',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.priority', 'high');

        $message = Message::firstOrFail();

        $this->assertSame(1, Redis::llen('broker:queue:emails:ready:high'));
        $this->assertSame((string) $message->id, Redis::rpop('broker:queue:emails:ready:high'));
    }

    public function test_delayed_message_is_not_consumed_until_recovered(): void
    {
        $this->postJson('/api/queues', ['name' => 'reports'])->assertCreated();
        $this->postJson('/api/queues/reports/messages', [
            'payload' => ['id' => 10],
            'delay_seconds' => 30,
        ])->assertCreated()->assertJsonPath('data.status', 'delayed');

        $this->postJson('/api/queues/reports/messages/consume', [
            'consumer_id' => 'consumer-1',
        ])->assertOk()
            ->assertJsonPath('data.message', null)
            ->assertJsonPath('data.empty', true);

        $message = Message::firstOrFail();
        $message->update(['available_at' => now()->subSecond()]);
        Redis::zadd('broker:queue:reports:delayed', now()->subSecond()->timestamp, (string) $message->id);

        $this->postJson('/api/broker/recover')->assertOk()->assertJsonPath('data.delayed', 1);

        $this->postJson('/api/queues/reports/messages/consume', [
            'consumer_id' => 'consumer-1',
        ])->assertOk()
            ->assertJsonPath('data.message.id', $message->id)
            ->assertJsonPath('data.empty', false);
    }

    public function test_consume_ack_marks_message_done(): void
    {
        $this->postJson('/api/queues', ['name' => 'jobs'])->assertCreated();
        $this->postJson('/api/queues/jobs/messages', [
            'payload' => ['task' => 'resize'],
        ])->assertCreated();

        $consume = $this->postJson('/api/queues/jobs/messages/consume', [
            'consumer_id' => 'consumer-a',
            'visibility_timeout' => 30,
        ])->assertOk()
            ->assertJsonPath('data.message.status', 'processing')
            ->assertJsonPath('data.empty', false)
            ->json('data');

        $this->postJson('/api/messages/'.$consume['message']['id'].'/ack', [
            'ack_token' => $consume['ack_token'],
            'result' => ['ok' => true],
        ])->assertOk()
            ->assertJsonPath('data.status', 'done')
            ->assertJsonPath('data.result.ok', true);

        $this->assertDatabaseHas('messages', [
            'id' => $consume['message']['id'],
            'status' => MessageStatuses::DONE->value,
            'ack_token_hash' => null,
        ]);
    }

    public function test_expired_ack_token_is_rejected(): void
    {
        $this->postJson('/api/queues', ['name' => 'jobs'])->assertCreated();
        $this->postJson('/api/queues/jobs/messages', [
            'payload' => ['task' => 'resize'],
        ])->assertCreated();

        $consume = $this->postJson('/api/queues/jobs/messages/consume', [
            'consumer_id' => 'consumer-a',
            'visibility_timeout' => 1,
        ])->json('data');

        Redis::del('broker:message:'.$consume['message']['id'].':token');

        $this->postJson('/api/messages/'.$consume['message']['id'].'/ack', [
            'ack_token' => $consume['ack_token'],
            'result' => ['ok' => true],
        ])->assertConflict()
            ->assertJsonPath('message', 'Invalid or expired ack token.');
    }

    public function test_nack_requeues_message_when_attempts_remain(): void
    {
        $this->postJson('/api/queues', ['name' => 'jobs'])->assertCreated();
        $this->postJson('/api/queues/jobs/messages', [
            'payload' => ['task' => 'resize'],
            'max_attempts' => 2,
        ])->assertCreated();

        $consume = $this->postJson('/api/queues/jobs/messages/consume', [
            'consumer_id' => 'consumer-a',
        ])->json('data');

        $this->postJson('/api/messages/'.$consume['message']['id'].'/nack', [
            'ack_token' => $consume['ack_token'],
            'error' => 'temporary failure',
            'requeue' => true,
        ])->assertOk()->assertJsonPath('data.status', 'failed');

        $this->assertSame(1, Redis::llen('broker:queue:jobs:ready:normal'));
    }

    public function test_expired_processing_message_is_recovered(): void
    {
        $this->postJson('/api/queues', ['name' => 'jobs'])->assertCreated();
        $this->postJson('/api/queues/jobs/messages', ['payload' => ['task' => 'resize']])->assertCreated();

        $consume = $this->postJson('/api/queues/jobs/messages/consume', [
            'consumer_id' => 'consumer-a',
            'visibility_timeout' => 1,
        ])->json('data');

        Message::whereKey($consume['message']['id'])->update(['reserved_until' => now()->subSecond()]);
        Redis::zadd('broker:queue:jobs:processing', now()->subSecond()->timestamp, (string) $consume['message']['id']);

        $this->postJson('/api/broker/recover')->assertOk()->assertJsonPath('data.expired', 1);

        $this->assertDatabaseHas('messages', [
            'id' => $consume['message']['id'],
            'status' => MessageStatuses::PENDING->value,
            'ack_token_hash' => null,
        ]);
    }

    public function test_message_moves_to_dead_after_max_attempts(): void
    {
        $this->postJson('/api/queues', ['name' => 'jobs'])->assertCreated();
        $this->postJson('/api/queues/jobs/messages', [
            'payload' => ['task' => 'resize'],
            'max_attempts' => 1,
        ])->assertCreated();

        $consume = $this->postJson('/api/queues/jobs/messages/consume', [
            'consumer_id' => 'consumer-a',
        ])->json('data');

        Message::whereKey($consume['message']['id'])->update(['reserved_until' => now()->subSecond()]);
        Redis::zadd('broker:queue:jobs:processing', now()->subSecond()->timestamp, (string) $consume['message']['id']);

        $this->postJson('/api/broker/recover')->assertOk()->assertJsonPath('data.expired', 1);

        $this->assertDatabaseHas('messages', [
            'id' => $consume['message']['id'],
            'status' => MessageStatuses::DEAD->value,
        ]);
    }
}
