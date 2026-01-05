<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_types', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();          // e.g. stat-comb-residential
            $table->string('name');                   // display name
            $table->string('sector_key')->index();    // e.g. stationary_combustion
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_types');
    }
};
