<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_facts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_source_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ingestion_event_id')->nullable()->constrained()->nullOnDelete();
            $table->string('external_id')->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->json('dimensions')->nullable();
            $table->json('measures')->nullable();
            $table->timestamps();

            $table->index(['integration_source_id', 'created_at']);
            $table->index(['integration_source_id', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_facts');
    }
};
