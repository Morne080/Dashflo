<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dashboard_id')->constrained('dashboards')->cascadeOnDelete();
            $table->string('widget_type');
            $table->string('metric_key');
            $table->string('title')->nullable();
            $table->json('config_json')->nullable();
            $table->json('filters_json')->nullable();
            $table->unsignedSmallInteger('layout_x')->default(0);
            $table->unsignedSmallInteger('layout_y')->default(0);
            $table->unsignedSmallInteger('layout_w')->default(1);
            $table->unsignedSmallInteger('layout_h')->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['dashboard_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_widgets');
    }
};
