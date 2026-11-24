<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('result_details', function (Blueprint $table) {
            $table->id();

            /*
            |--------------------------------------------------------------------------
            | Result
            |--------------------------------------------------------------------------
            */

            $table->foreignId('result_id')
                ->constrained('results')
                ->cascadeOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Student and Subject
            |--------------------------------------------------------------------------
            */

            $table->foreignId('student_id')
                ->constrained('students')
                ->cascadeOnDelete();

            $table->foreignId('subject_id')
                ->constrained('subjects')
                ->cascadeOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Calculated Subject Result
            |--------------------------------------------------------------------------
            */

            $table->decimal('total_score', 8, 2)
                ->default(0);

            $table->string('grade')
                ->nullable();

            $table->string('remark')
                ->nullable();

            $table->unsignedInteger('subject_position')
                ->nullable();

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Prevent Duplicate Subject Result
            |--------------------------------------------------------------------------
            */

            $table->unique(
                [
                    'result_id',
                    'subject_id',
                ],
                'result_detail_subject_unique'
            );

            /*
            |--------------------------------------------------------------------------
            | Lookup
            |--------------------------------------------------------------------------
            */

            $table->index(
                [
                    'student_id',
                    'subject_id',
                ],
                'result_detail_student_subject'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('result_details');
    }
};