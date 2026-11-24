<?php

namespace App\Http\Controllers;

use App\Models\ParentModel;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ParentController extends Controller
{
    /**
     * Only school administrators can manage parent accounts.
     */
    private function authorizeManagement(Request $request): int
    {
        $user = $request->user();

        abort_unless(
            $user && $user->hasAnyRole(['School Admin', 'Super Admin']),
            403,
            'Only school administrators can manage parent accounts.'
        );

        abort_unless(
            $user->school_id,
            403,
            'Your account is not assigned to a school.'
        );

        return (int) $user->school_id;
    }

    /**
     * List parents belonging to the administrator's school.
     */
    public function index(Request $request): JsonResponse
    {
        $schoolId = $this->authorizeManagement($request);

        $parents = ParentModel::with([
            'user:id,name,email,status',
            'students:id,school_id,admission_number,first_name,middle_name,last_name',
        ])
            ->where('school_id', $schoolId)
            ->latest()
            ->paginate(20);

        return response()->json([
            'success' => true,
            'message' => 'Parents retrieved successfully.',
            'data' => $parents,
        ]);
    }

    /**
     * Create a parent login account and link students.
     */
    public function store(Request $request): JsonResponse
    {
        $schoolId = $this->authorizeManagement($request);

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'address' => ['nullable', 'string', 'max:1000'],
            'relationship' => ['nullable', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('students', 'id')
                    ->where('school_id', $schoolId),
            ],
            'status' => ['sometimes', 'boolean'],
        ]);

        $parent = DB::transaction(function () use (
            $validated,
            $schoolId
        ) {
            $name = trim(
                $validated['first_name'] . ' ' . $validated['last_name']
            );

            $user = User::create([
                'school_id' => $schoolId,
                'name' => $name,
                'email' => strtolower(trim($validated['email'])),
                'password' => $validated['password'],
                'status' => $validated['status'] ?? true,
            ]);

            $user->assignRole('Parent');

            $parent = ParentModel::create([
                'school_id' => $schoolId,
                'user_id' => $user->id,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone' => $validated['phone'] ?? null,
                'email' => strtolower(trim($validated['email'])),
                'address' => $validated['address'] ?? null,
                'relationship' => $validated['relationship'] ?? null,
                'status' => $validated['status'] ?? true,
            ]);

            $parent->students()->sync($validated['student_ids']);

            return $parent;
        });

        $parent->load([
            'user:id,name,email,status',
            'students',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Parent account created and students linked successfully.',
            'data' => $parent,
        ], 201);
    }

    /**
     * View one parent and linked students.
     */
    public function show(Request $request, int $parentId): JsonResponse
    {
        $schoolId = $this->authorizeManagement($request);

        $parent = ParentModel::with([
            'user:id,name,email,status',
            'students',
        ])
            ->where('school_id', $schoolId)
            ->findOrFail($parentId);

        return response()->json([
            'success' => true,
            'message' => 'Parent retrieved successfully.',
            'data' => $parent,
        ]);
    }

    /**
     * Update parent details and optionally change linked students.
     */
    public function update(Request $request, int $parentId): JsonResponse
    {
        $schoolId = $this->authorizeManagement($request);

        $parent = ParentModel::where('school_id', $schoolId)
            ->with('user')
            ->findOrFail($parentId);

        $validated = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:100'],
            'last_name' => ['sometimes', 'required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($parent->user_id),
            ],
            'address' => ['nullable', 'string', 'max:1000'],
            'relationship' => ['nullable', 'string', 'max:50'],
            'password' => ['sometimes', 'required', 'string', 'min:8', 'confirmed'],
            'student_ids' => ['sometimes', 'required', 'array', 'min:1'],
            'student_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('students', 'id')
                    ->where('school_id', $schoolId),
            ],
        ]);

        DB::transaction(function () use ($parent, $validated) {
            $parentFields = [];

            foreach ([
                'first_name',
                'last_name',
                'phone',
                'email',
                'address',
                'relationship',
            ] as $field) {
                if (array_key_exists($field, $validated)) {
                    $parentFields[$field] = $validated[$field];
                }
            }

            if ($parentFields) {
                $parent->update($parentFields);
            }

            if (
                array_key_exists('first_name', $validated) ||
                array_key_exists('last_name', $validated)
            ) {
                $parent->user->name = trim(
                    $parent->first_name . ' ' . $parent->last_name
                );
            }

            if (array_key_exists('email', $validated)) {
                $parent->user->email = strtolower(trim($validated['email']));
            }

            if (!empty($validated['password'])) {
                $parent->user->password = $validated['password'];
            }

            if (
                array_key_exists('first_name', $validated) ||
                array_key_exists('last_name', $validated) ||
                array_key_exists('email', $validated) ||
                !empty($validated['password'])
            ) {
                $parent->user->save();
            }

            if (array_key_exists('student_ids', $validated)) {
                $parent->students()->sync($validated['student_ids']);
            }
        });

        $parent->load(['user:id,name,email,status', 'students']);

        return response()->json([
            'success' => true,
            'message' => 'Parent updated successfully.',
            'data' => $parent,
        ]);
    }

    /**
     * Activate or deactivate a parent account.
     */
    public function updateStatus(Request $request, int $parentId): JsonResponse
    {
        $schoolId = $this->authorizeManagement($request);

        $validated = $request->validate([
            'status' => ['required', 'boolean'],
        ]);

        $parent = ParentModel::where('school_id', $schoolId)
            ->with('user')
            ->findOrFail($parentId);

        DB::transaction(function () use ($parent, $validated) {
            $parent->update([
                'status' => $validated['status'],
            ]);

            $parent->user->update([
                'status' => $validated['status'],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => $validated['status']
                ? 'Parent account activated successfully.'
                : 'Parent account deactivated successfully.',
            'data' => $parent->fresh(['user', 'students']),
        ]);
    }
}
