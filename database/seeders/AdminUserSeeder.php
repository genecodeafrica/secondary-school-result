<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $school = School::firstOrCreate(
            [
                'code' => 'DEMO001',
            ],
            [
                'name' => 'Demo Secondary School',
                'address' => 'Nigeria',
                'phone' => null,
                'email' => null,
                'status' => true,
            ]
        );

        $user = User::firstOrCreate(
            [
                'email' => 'admin@school.test',
            ],
            [
                'school_id' => $school->id,
                'name' => 'System Administrator',
                'password' => Hash::make('Admin@12345'),
                'status' => true,
            ]
        );

        $user->school_id = $school->id;
        $user->save();

        $user->assignRole('School Admin');
    }
}