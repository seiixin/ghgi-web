<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_mappings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('form_type_id')
                ->constrained('form_types')
                ->cascadeOnDelete();

            $table->unsignedSmallInteger('year')->index();
            $table->json('mapping_json')->default(json_encode(new stdClass())); // field_key -> activity_input_key

            $table->timestamps();

            $table->unique(['form_type_id', 'year'], 'uniq_form_mapping_year');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_mappings');
    }
};
