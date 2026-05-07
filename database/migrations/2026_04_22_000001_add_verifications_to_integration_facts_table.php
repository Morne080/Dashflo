<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('integration_facts', function (Blueprint $table) {
            $table->json('verifications')->nullable()->after('measures');
        });
    }

    public function down(): void
    {
        Schema::table('integration_facts', function (Blueprint $table) {
            $table->dropColumn('verifications');
        });
    }
};
