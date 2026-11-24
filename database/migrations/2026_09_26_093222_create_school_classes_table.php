<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('school_id')
                ->constrained('schools')
                ->cascadeOnDelete();

            $table->foreignId('department_id')
                ->nullable()
                ->constrained('departments')
                ->nullOnDelete();

            $table->string('name');
            $table->string('level')->nullable();
            $table->string('section')->nullable();

            $table->foreignId('class_teacher_id')
                ->nullable()
                ->constrained('teachers')
                ->nullOnDelete();

            $table->boolean('status')->default(true);

            $table->timestamps();

            $table->index([
                'school_id',
                'name'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};