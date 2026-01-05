<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_schema_versions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('form_type_id')
                ->constrained('form_types')
                ->cascadeOnDelete();

            $table->unsignedSmallInteger('year')->index();   // inventory year
            $table->unsignedSmallInteger('version');         // version number (1,2,3,...)

            $table->json('schema_json');                     // logical schema: fields, types, rules
            $table->json('ui_json')->nullable();             // UI hints: sections, ordering, options

            $table->string('status')->default('active')->index(); // active | draft | deprecated

            $table->timestamps();

            $table->unique(['form_type_id', 'year', 'version'], 'uniq_form_schema_version');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_schema_versions');
    }
};
