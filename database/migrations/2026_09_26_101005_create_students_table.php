<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();

            $table->foreignId('school_id')
                ->constrained('schools')
                ->cascadeOnDelete();

            $table->string('admission_number');

            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');

            $table->enum('gender', [
                'Male',
                'Female',
            ]);

            $table->date('date_of_birth')->nullable();

            $table->string('photo')->nullable();

            $table->string('phone')->nullable();
            $table->string('email')->nullable();

            $table->string('address')->nullable();

            $table->boolean('status')->default(true);

            $table->timestamps();

            $table->unique([
                'school_id',
                'admission_number'
            ]);

            $table->index([
                'school_id',
                'last_name'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};