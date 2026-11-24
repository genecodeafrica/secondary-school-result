<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('results', function (Blueprint $table) {
            $table->id();

            /*
            |--------------------------------------------------------------------------
            | Student and Academic Context
            |--------------------------------------------------------------------------
            */

            $table->foreignId('student_id')
                ->constrained('students')
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

            /*
            |--------------------------------------------------------------------------
            | Calculated Result
            |--------------------------------------------------------------------------
            */

            $table->decimal('total_score', 10, 2)
                ->default(0);

            $table->decimal('average', 6, 2)
                ->default(0);

            $table->unsignedInteger('position')
                ->nullable();

            $table->string('overall_grade')
                ->nullable();

            $table->string('overall_remark')
                ->nullable();

            /*
            |--------------------------------------------------------------------------
            | Result Workflow
            |--------------------------------------------------------------------------
            |
            | draft
            | submitted
            | under_review
            | approved
            | published
            |
            */

            $table->string('status')
                ->default('draft');

            /*
            |--------------------------------------------------------------------------
            | Approval
            |--------------------------------------------------------------------------
            */

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('approved_at')
                ->nullable();

            /*
            |--------------------------------------------------------------------------
            | Publication
            |--------------------------------------------------------------------------
            */

            $table->timestamp('published_at')
                ->nullable();

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Prevent Duplicate Result
            |--------------------------------------------------------------------------
            */

            $table->unique(
                [
                    'student_id',
                    'class_id',
                    'academic_session_id',
                    'term_id',
                ],
                'student_result_unique'
            );

            /*
            |--------------------------------------------------------------------------
            | Lookup Index
            |--------------------------------------------------------------------------
            */

            $table->index(
                [
                    'class_id',
                    'academic_session_id',
                    'term_id',
                ],
                'result_class_lookup'
            );

            $table->index(
                [
                    'status',
                    'academic_session_id',
                    'term_id',
                ],
                'result_status_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('results');
    }
};