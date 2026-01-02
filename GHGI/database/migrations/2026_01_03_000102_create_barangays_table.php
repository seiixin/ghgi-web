\
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('barangays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lgu_id')->constrained('lgus')->cascadeOnDelete();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['lgu_id', 'name']);
            $table->index(['lgu_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangays');
    }
};
