<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submission_answers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('submission_id');
            $table->unsignedBigInteger('form_type_id');
            $table->unsignedSmallInteger('year');

            $table->string('field_key', 190);

            $table->longText('value_text')->nullable();
            $table->decimal('value_number', 18, 6)->nullable();
            $table->boolean('value_bool')->nullable();
            $table->json('value_json')->nullable();

            $table->string('option_key', 190)->nullable();
            $table->string('option_label', 255)->nullable();
            $table->string('label', 255)->nullable();
            $table->string('type', 50)->nullable();

            $table->timestamps();

            $table->unique(['submission_id', 'field_key']);
            $table->index(['form_type_id', 'year', 'field_key']);
            $table->index(['field_key']);
            $table->index(['submission_id']);

            $table->foreign('submission_id')->references('id')->on('submissions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submission_answers');
    }
};
