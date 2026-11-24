<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Seed application roles and permissions.
     */
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Permissions
        |--------------------------------------------------------------------------
        */

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


        /*
        |--------------------------------------------------------------------------
        | Roles
        |--------------------------------------------------------------------------
        */

        $teacher = Role::firstOrCreate([
            'name' => 'teacher',
            'guard_name' => 'web',
        ]);

        $reviewer = Role::firstOrCreate([
            'name' => 'reviewer',
            'guard_name' => 'web',
        ]);

        $approver = Role::firstOrCreate([
            'name' => 'approver',
            'guard_name' => 'web',
        ]);

        $publisher = Role::firstOrCreate([
            'name' => 'publisher',
            'guard_name' => 'web',
        ]);

        $administrator = Role::firstOrCreate([
            'name' => 'administrator',
            'guard_name' => 'web',
        ]);


        /*
        |--------------------------------------------------------------------------
        | Teacher Permissions
        |--------------------------------------------------------------------------
        */

        $teacher->syncPermissions([
            'results.view',
            'results.enter',
            'results.process',
            'results.submit',
        ]);


        /*
        |--------------------------------------------------------------------------
        | Reviewer Permissions
        |--------------------------------------------------------------------------
        */

        $reviewer->syncPermissions([
            'results.view',
            'results.review',
            'results.reject',
        ]);


        /*
        |--------------------------------------------------------------------------
        | Approver Permissions
        |--------------------------------------------------------------------------
        */

        $approver->syncPermissions([
            'results.view',
            'results.review',
            'results.approve',
            'results.reject',
        ]);


        /*
        |--------------------------------------------------------------------------
        | Publisher Permissions
        |--------------------------------------------------------------------------
        */

        $publisher->syncPermissions([
            'results.view',
            'results.publish',
        ]);


        /*
        |--------------------------------------------------------------------------
        | Administrator Permissions
        |--------------------------------------------------------------------------
        */

        $administrator->syncPermissions(
            Permission::all()
        );

        $student = Role::firstOrCreate([
            'name' => 'Student',
            'guard_name' => 'web',
        ]);

        $parent = Role::firstOrCreate([
            'name' => 'Parent',
            'guard_name' => 'web',
        ]);

        $student->syncPermissions(['results.view']);
        $parent->syncPermissions(['results.view']);

        /*
|--------------------------------------------------------------------------
| Student and Parent Permissions
|--------------------------------------------------------------------------
*/

        $student = Role::firstOrCreate([
            'name' => 'Student',
            'guard_name' => 'web',
        ]);

        $parent = Role::firstOrCreate([
            'name' => 'Parent',
            'guard_name' => 'web',
        ]);

        $student->syncPermissions([
            'results.view',
        ]);

        $parent->syncPermissions([
            'results.view',
        ]);
    }
}