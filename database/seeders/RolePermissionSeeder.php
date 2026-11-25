<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'results.view',
            'results.enter',
            'results.process',
            'results.submit',
            'results.review',
            'results.approve',
            'results.reject',
            'results.publish',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        $rolePermissions = [
            'Super Admin' => [],

            'School Admin' => $permissions,

            'Teacher' => [
                'results.view',
                'results.enter',
                'results.process',
                'results.submit',
            ],

            'Form Teacher' => [
                'results.view',
                'results.review',
                'results.reject',
            ],

            'Vice Principal' => [
                'results.view',
                'results.review',
                'results.approve',
                'results.reject',
            ],

            'Principal' => [
                'results.view',
                'results.approve',
                'results.publish',
                'results.reject',
            ],

            'Student' => [
                'results.view',
            ],

            'Parent' => [
                'results.view',
            ],

            'Accountant' => [],
        ];

        foreach ($rolePermissions as $roleName => $rolePermissionNames) {
            $role = Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
            ]);

            $role->syncPermissions($rolePermissionNames);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
