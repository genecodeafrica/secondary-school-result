<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id();

            $table->foreignId('school_id')
                ->constrained('schools')
                ->cascadeOnDelete();

            $table->string('name');

            $table->string('code');

            $table->decimal('minimum_score', 5, 2);

            $table->decimal('maximum_score', 5, 2);

            $table->string('remark');

            $table->unsignedInteger('display_order')
                ->default(0);

            $table->boolean('is_active')
                ->default(true);

            $table->timestamps();

            $table->unique(
                ['school_id', 'code'],
                'grade_school_code_unique'
            );

            $table->index(
                ['school_id', 'minimum_score', 'maximum_score'],
                'grade_score_range_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};