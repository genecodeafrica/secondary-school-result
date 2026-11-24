<?php

namespace App\Http\Controllers;

use App\Models\School;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class SchoolController extends Controller
{
    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless(
            $request->user() &&
            $request->user()->hasRole('Super Admin'),
            403,
            'Only the Super Admin can manage school registration.'
        );
    }

    /**
     * List all registered schools.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $schools = School::withCount('users')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $schools,
        ]);
    }

    /**
     * Register a school and its initial School Admin.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                'unique:schools,code',
            ],
            'address' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],

            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'admin_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $result = DB::transaction(function () use ($validated) {
            $school = School::create([
                'name' => $validated['name'],
                'code' => $validated['code'],
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'status' => true,
            ]);

            $schoolAdminRole = Role::firstOrCreate([
                'name' => 'School Admin',
                'guard_name' => 'web',
            ]);

            $admin = User::create([
                'school_id' => $school->id,
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => $validated['admin_password'],
                'status' => true,
            ]);

            $admin->assignRole($schoolAdminRole);

            return [
                'school' => $school,
                'admin' => $admin,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'School and initial School Admin registered successfully.',
            'data' => [
                'school' => $result['school'],
                'admin' => $result['admin']->only([
                    'id',
                    'school_id',
                    'name',
                    'email',
                    'status',
                ]),
            ],
        ], 201);
    }
}
