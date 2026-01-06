<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            // Location (dropdown-derived)
            $table->string('reg_name', 120)->nullable()->after('status');
            $table->string('prov_name', 120)->nullable()->after('reg_name');
            $table->string('city_name', 120)->nullable()->after('prov_name');
            $table->string('brgy_name', 120)->nullable()->after('city_name');

            // Indexes for filtering/aggregation
            $table->index(['prov_name', 'city_name'], 'submissions_prov_city_idx');
            $table->index(['prov_name', 'city_name', 'brgy_name'], 'submissions_prov_city_brgy_idx');
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex('submissions_prov_city_idx');
            $table->dropIndex('submissions_prov_city_brgy_idx');

            // Drop columns
            $table->dropColumn(['reg_name', 'prov_name', 'city_name', 'brgy_name']);
        });
    }
};
