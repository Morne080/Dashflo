<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->enum('vertical', ['MVA', 'WC', 'Premise']);
            $table->string('state', 2);
            $table->date('accident_date')->nullable();
            $table->string('accident_sol')->nullable();
            $table->string('treatment_time')->nullable();
            $table->string('injury_type')->nullable();
            $table->enum('phone_verification', [
                'Exact Match',
                'No Match',
                'Partial Match',
                'Match Error',
                'Call Verified',
                'Verified',
            ])->nullable();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->string('source');
            $table->string('utm_source')->nullable();
            $table->string('lead_type');
            $table->enum('status', ['sold', 'unsold', 'returned', 'dq', 'fake', 'converted']);
            $table->string('disposition')->nullable();
            $table->decimal('cost', 10, 2)->default(0);
            $table->decimal('revenue', 10, 2)->default(0);
            $table->decimal('ipl', 10, 2)->default(0);
            $table->boolean('is_conversion')->default(false);
            $table->foreignId('buyer_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
