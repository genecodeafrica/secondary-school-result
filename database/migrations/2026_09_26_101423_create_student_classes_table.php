<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_classes', function (Blueprint $table) {
            $table->id();

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

            $table->boolean('is_current')->default(false);

            $table->boolean('status')->default(true);

            $table->timestamps();

            /*
             * Short custom name prevents MySQL's
             * identifier-length error.
             */
            $table->unique(
                [
                    'student_id',
                    'class_id',
                    'academic_session_id',
                    'term_id',
                ],
                'student_class_unique'
            );

            $table->index(
                [
                    'academic_session_id',
                    'term_id',
                    'class_id',
                ],
                'student_class_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_classes');
    }
};