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
            'Only the Super Admin can manage schools.'
        );
    }

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

    public function store(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:schools,code'],
            'address' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'admin_password' => ['required', 'string', 'min:8', 'confirmed'],
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

            return ['school' => $school, 'admin' => $admin];
        });

        return response()->json([
            'success' => true,
            'message' => 'School and initial School Admin registered successfully.',
            'data' => [
                'school' => $result['school'],
                'admin' => $result['admin']->only([
                    'id', 'school_id', 'name', 'email', 'status',
                ]),
            ],
        ], 201);
    }

    public function update(Request $request, int $schoolId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $school = School::findOrFail($schoolId);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('schools', 'code')->ignore($school->id),
            ],
            'address' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $school->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'School details updated successfully.',
            'data' => $school->fresh()->loadCount('users'),
        ]);
    }

    public function updateStatus(Request $request, int $schoolId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'status' => ['required', 'boolean'],
        ]);

        $school = School::findOrFail($schoolId);
        $active = (bool) $validated['status'];

        DB::transaction(function () use ($school, $active) {
            $school->update(['status' => $active]);

            if (!$active) {
                $school->users()
                    ->select('id')
                    ->chunkById(200, function ($users) {
                        foreach ($users as $user) {
                            $user->tokens()->delete();
                        }
                    });
            }
        });

        return response()->json([
            'success' => true,
            'message' => $active
                ? 'School activated successfully.'
                : 'School deactivated successfully. Its users have been logged out.',
            'data' => $school->fresh()->loadCount('users'),
        ]);
    }
}
