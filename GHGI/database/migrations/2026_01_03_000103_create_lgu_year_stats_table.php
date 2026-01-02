\
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lgu_year_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lgu_id')->constrained('lgus')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedBigInteger('population')->nullable();
            $table->decimal('area_km2', 12, 3)->nullable();
            $table->timestamps();

            $table->unique(['lgu_id', 'year']);
            $table->index(['year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lgu_year_stats');
    }
};
