<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();

            $table->foreignId('school_id')
                ->constrained('schools')
                ->cascadeOnDelete();

            $table->foreignId('department_id')
                ->nullable()
                ->constrained('departments')
                ->nullOnDelete();

            $table->string('code');
            $table->string('name');

            $table->string('category')
                ->nullable();

            $table->boolean('status')->default(true);

            $table->timestamps();

            $table->unique([
                'school_id',
                'code'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subjects');
    }
};