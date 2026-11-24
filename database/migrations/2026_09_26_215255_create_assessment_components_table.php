<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_components', function (Blueprint $table) {
            $table->id();

            $table->foreignId('school_id')
                ->constrained('schools')
                ->cascadeOnDelete();

            $table->string('name');

            $table->string('code');

            $table->decimal('maximum_score', 8, 2);

            $table->decimal('weight', 5, 2);

            $table->unsignedInteger('display_order')
                ->default(0);

            $table->boolean('is_active')
                ->default(true);

            $table->timestamps();

            $table->unique(
                ['school_id', 'code'],
                'assessment_component_school_code_unique'
            );

            $table->index(
                ['school_id', 'display_order'],
                'assessment_component_school_order'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_components');
    }
};