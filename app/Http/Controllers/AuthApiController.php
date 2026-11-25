<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthApiController extends Controller
{
    /**
     * Login user.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with([
            'school',
            'student',
            'parent.students',
        ])
            ->where('email', $validated['email'])
            ->first();

        if (
            !$user ||
            !Hash::check($validated['password'], $user->password)
        ) {
            throw ValidationException::withMessages([
                'email' => [
                    'The provided credentials are incorrect.',
                ],
            ]);
        }

        if (!$user->status) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is inactive. Please contact the administrator.',
            ], 403);
        }

        // Super Admin does not require a school.
        if (!$user->hasRole('Super Admin')) {

            // Ensure the user belongs to a registered school.
            if (!$user->school_id || !$user->school) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account is not associated with a school.',
                ], 403);
            }

            // Prevent login when the school is deactivated.
            if (!$user->school->status) {
                return response()->json([
                    'success' => false,
                    'message' => 'This school is currently deactivated. Please contact the Super Admin.',
                ], 403);
            }
        }

        $user->tokens()->delete();

        $token = $user->createToken(
            'school-result-system'
        )->plainTextToken;

        $user->update([
            'last_login_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => $this->userData($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    /**
     * Logout the currently authenticated user.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout successful.',
        ]);
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->load([
            'school',
            'student',
            'parent.students',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Authenticated user retrieved successfully.',
            'data' => $this->userData($user),
        ]);
    }

    /**
     * Build the authenticated user's API representation.
     */
    protected function userData(User $user): array
    {
        $teacher = Teacher::with('school')
            ->where('user_id', $user->id)
            ->where('school_id', $user->school_id)
            ->where('status', true)
            ->first();

        $student = $user->student;

        if (
            $student &&
            (int) $student->school_id !== (int) $user->school_id
        ) {
            $student = null;
        }

        $parent = $user->parent;

        if (
            $parent &&
            (int) $parent->school_id !== (int) $user->school_id
        ) {
            $parent = null;
        }

        $linkedStudents = $parent
            ? $parent->students
                ->where('school_id', $user->school_id)
                ->map(function ($linkedStudent) {
                    return [
                        'id' => $linkedStudent->id,
                        'admission_number' => $linkedStudent->admission_number,
                        'first_name' => $linkedStudent->first_name,
                        'middle_name' => $linkedStudent->middle_name,
                        'last_name' => $linkedStudent->last_name,
                        'gender' => $linkedStudent->gender,
                        'class_id' => $linkedStudent->class_id ?? null,
                    ];
                })
                ->values()
                ->all()
            : [];

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => (bool) $user->status,

            'school' => $user->school
                ? [
                    'id' => $user->school->id,
                    'name' => $user->school->name,
                    'code' => $user->school->code,
                    'address' => $user->school->address,
                    'phone' => $user->school->phone,
                    'email' => $user->school->email,
                    'logo' => $user->school->logo,
                ]
                : null,

            'roles' => $user->getRoleNames()->values(),

            'permissions' => $user->getAllPermissions()
                ->pluck('name')
                ->values(),

            'teacher' => $teacher
                ? [
                    'id' => $teacher->id,
                    'teacher_id' => $teacher->teacher_id,
                    'first_name' => $teacher->first_name,
                    'middle_name' => $teacher->middle_name,
                    'last_name' => $teacher->last_name,
                    'phone' => $teacher->phone,
                ]
                : null,

            'student' => $student
                ? [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'first_name' => $student->first_name,
                    'middle_name' => $student->middle_name,
                    'last_name' => $student->last_name,
                    'gender' => $student->gender,
                    'date_of_birth' => $student->date_of_birth,
                    'phone' => $student->phone,
                ]
                : null,

            'parent' => $parent
                ? [
                    'id' => $parent->id,
                    'first_name' => $parent->first_name,
                    'last_name' => $parent->last_name,
                    'phone' => $parent->phone,
                    'email' => $parent->email,
                    'address' => $parent->address,
                    'relationship' => $parent->relationship,
                    'students' => $linkedStudents,
                ]
                : null,
        ];
    }
}
