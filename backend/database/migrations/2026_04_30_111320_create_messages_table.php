<?php

use App\Enum\MessageStatuses;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('queue_id')->constrained()->cascadeOnDelete();
            $table->json('payload');
            $table->string('status')->default(MessageStatuses::PENDING->value)->index();
            $table->string('priority')->default('normal')->index();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->unsignedSmallInteger('max_attempts')->default(3);
            $table->timestamp('available_at')->nullable()->index();
            $table->timestamp('reserved_until')->nullable()->index();
            $table->string('consumer_id')->nullable()->index();
            $table->string('ack_token_hash')->nullable();
            $table->json('result')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
