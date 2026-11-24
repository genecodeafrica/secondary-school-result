<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {

            $table->id();

            $table->foreignId('school_id')
                ->nullable()
                ->constrained('schools')
                ->nullOnDelete();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('action');

            $table->string('module')
                ->nullable();

            $table->nullableMorphs('auditable');

            $table->json('old_values')
                ->nullable();

            $table->json('new_values')
                ->nullable();

            $table->ipAddress('ip_address')
                ->nullable();

            $table->text('user_agent')
                ->nullable();

            $table->timestamps();

            $table->index(
                ['school_id', 'created_at'],
                'audit_school_created_index'
            );

            $table->index(
                ['user_id', 'created_at'],
                'audit_user_created_index'
            );

            $table->index(
                ['module', 'action'],
                'audit_module_action_index'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};