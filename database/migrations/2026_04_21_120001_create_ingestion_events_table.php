<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingestion_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_source_id')->constrained()->cascadeOnDelete();
            $table->string('direction', 32); // inbound_webhook | outbound_pull
            $table->string('status', 32)->default('received'); // received | processing | processed | failed
            $table->string('idempotency_key')->nullable();
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->text('error_message')->nullable();
            $table->string('payload_disk', 32)->nullable();
            $table->string('payload_path', 512)->nullable();
            $table->unsignedInteger('bytes_received')->default(0);
            $table->unsignedInteger('facts_created')->default(0);
            $table->timestamps();

            $table->index(['integration_source_id', 'created_at']);
            $table->unique(['integration_source_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingestion_events');
    }
};
