<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('form_type_id');
            $table->unsignedBigInteger('schema_version_id')->nullable();
            $table->unsignedBigInteger('mapping_id')->nullable();
            $table->unsignedSmallInteger('year');
            $table->string('source', 20)->default('admin'); // admin|mobile
            $table->string('status', 20)->default('draft'); // draft|submitted|reviewed|rejected
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index(['form_type_id', 'year']);
            $table->index(['status', 'created_at']);
            $table->index(['source', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
