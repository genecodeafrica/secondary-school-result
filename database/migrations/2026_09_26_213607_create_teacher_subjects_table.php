<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_subjects', function (Blueprint $table) {
            $table->id();

            $table->foreignId('teacher_id')
                ->constrained('teachers')
                ->cascadeOnDelete();

            $table->foreignId('class_id')
                ->constrained('classes')
                ->cascadeOnDelete();

            $table->foreignId('subject_id')
                ->constrained('subjects')
                ->cascadeOnDelete();

            $table->foreignId('academic_session_id')
                ->constrained('academic_sessions')
                ->cascadeOnDelete();

            $table->timestamps();

            /*
             * Prevent the same teacher from being assigned
             * to the same subject and class twice
             * within the same academic session.
             */
            $table->unique(
                [
                    'teacher_id',
                    'class_id',
                    'subject_id',
                    'academic_session_id',
                ],
                'teacher_subject_unique'
            );

            $table->index(
                [
                    'class_id',
                    'subject_id',
                    'academic_session_id',
                ],
                'teacher_subject_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_subjects');
    }
};