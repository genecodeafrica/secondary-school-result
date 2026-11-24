<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $adminPassword = env('SEED_ADMIN_PASSWORD');

        if (!$adminPassword) {
            throw new RuntimeException(
                'Please set SEED_ADMIN_PASSWORD in your .env file before running the admin seeder.'
            );
        }

        $school = School::firstOrCreate(
            ['code' => 'DEMO001'],
            [
                'name' => 'Demo Secondary School',
                'address' => 'Nigeria',
                'phone' => null,
                'email' => null,
                'status' => true,
            ]
        );

        $user = User::firstOrCreate(
            ['email' => 'admin@school.test'],
            [
                'school_id' => $school->id,
                'name' => 'System Administrator',
                'password' => Hash::make($adminPassword),
                'status' => true,
            ]
        );

        $user->school_id = $school->id;
        $user->save();

        $user->assignRole('School Admin');
    }
}
