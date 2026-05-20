<?php

use App\Enum\QueueStatuses;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('queues', 'status')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE queues DROP CONSTRAINT IF EXISTS queues_status_check');
        }

        DB::table('queues')
            ->whereIn('status', ['1', 'true', 't'])
            ->update(['status' => QueueStatuses::ACTIVE->value]);

        DB::table('queues')
            ->whereIn('status', ['0', 'false', 'f'])
            ->update(['status' => QueueStatuses::PAUSED->value]);

        DB::table('queues')
            ->whereNull('status')
            ->update(['status' => QueueStatuses::ACTIVE->value]);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE queues ALTER COLUMN status SET DEFAULT '".QueueStatuses::ACTIVE->value."'");
            DB::statement("ALTER TABLE queues ADD CONSTRAINT queues_status_check CHECK (status IN ('".QueueStatuses::ACTIVE->value."', '".QueueStatuses::PAUSED->value."'))");
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('queues', 'status')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE queues DROP CONSTRAINT IF EXISTS queues_status_check');
        }

        DB::table('queues')
            ->where('status', QueueStatuses::ACTIVE->value)
            ->update(['status' => '1']);

        DB::table('queues')
            ->where('status', QueueStatuses::PAUSED->value)
            ->update(['status' => '0']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE queues ALTER COLUMN status SET DEFAULT '1'");
            DB::statement("ALTER TABLE queues ADD CONSTRAINT queues_status_check CHECK (status IN ('0', '1'))");
        }
    }
};
