<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scores', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_id')
                ->constrained('students')
                ->cascadeOnDelete();

            $table->foreignId('subject_id')
                ->constrained('subjects')
                ->cascadeOnDelete();

            $table->foreignId('class_id')
                ->constrained('classes')
                ->cascadeOnDelete();

            $table->foreignId('academic_session_id')
                ->constrained('academic_sessions')
                ->cascadeOnDelete();

            $table->foreignId('term_id')
                ->constrained('terms')
                ->cascadeOnDelete();

            $table->foreignId('assessment_component_id')
                ->constrained('assessment_components')
                ->cascadeOnDelete();

            $table->decimal('score', 8, 2);

            $table->foreignId('entered_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('status')
                ->default('draft');

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Prevent duplicate scores
            |--------------------------------------------------------------------------
            */

            $table->unique(
                [
                    'student_id',
                    'subject_id',
                    'class_id',
                    'academic_session_id',
                    'term_id',
                    'assessment_component_id',
                ],
                'score_unique_record'
            );

            /*
            |--------------------------------------------------------------------------
            | Lookup index
            |--------------------------------------------------------------------------
            */

            $table->index(
                [
                    'class_id',
                    'subject_id',
                    'academic_session_id',
                    'term_id',
                ],
                'score_lookup_index'
            );

            $table->index(
                [
                    'student_id',
                    'academic_session_id',
                    'term_id',
                ],
                'student_score_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scores');
    }
};