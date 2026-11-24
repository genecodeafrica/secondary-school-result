<?php

namespace App\Http\Controllers;

use App\Models\AcademicSession;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Models\StudentClass;
use App\Models\Term;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    /**
     * List students with search, status and class filters.
     */
    public function index(Request $request): JsonResponse
    {
        $schoolId = $request->user()->school_id;

        $query = Student::query()
            ->where('school_id', $schoolId)
            ->with([
                'enrollments' => function ($query) {
                    $query->where('is_current', true)
                        ->with([
                            'schoolClass',
                            'academicSession',
                            'term',
                        ]);
                },
            ]);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($query) use ($search) {
                $query->where('admission_number', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhereRaw(
                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                        ["%{$search}%"]
                    )
                    ->orWhereRaw(
                        "CONCAT(first_name, ' ', middle_name, ' ', last_name) LIKE ?",
                        ["%{$search}%"]
                    );
            });
        }

        if ($request->has('status') && $request->input('status') !== '') {
            $validated = $request->validate([
                'status' => ['required', 'boolean'],
            ]);

            $query->where('status', $validated['status']);
        }

        if ($request->filled('class_id')) {
            $validated = $request->validate([
                'class_id' => ['required', 'integer', 'min:1'],
            ]);

            $query->whereHas('enrollments', function ($enrollment) use ($validated) {
                $enrollment->where('class_id', $validated['class_id'])
                    ->where('is_current', true)
                    ->where('status', true);
            });
        }

        $perPage = min(
            max((int) $request->input('per_page', 15), 1),
            100
        );

        $students = $query
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Students retrieved successfully.',
            'data' => $students,
        ]);
    }

    /**
     * Register a student and optionally enrol them.
     */
    public function store(Request $request): JsonResponse
    {
        $schoolId = $request->user()->school_id;
        $createAccount = $request->boolean('create_account');
    if (
        $createAccount &&
        !$request->user()->hasAnyRole(['School Admin', 'Super Admin'])
    ) {
        abort(403, 'Only school administrators can create student login accounts.');
    }

        $validated = $request->validate([
            'admission_number' => [
                'required',
                'string',
                'max:255',
                Rule::unique('students', 'admission_number')
                    ->where('school_id', $schoolId),
            ],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', Rule::in(['Male', 'Female'])],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => $createAccount
                ? [
                    'required',
                    'email',
                    'max:255',
                    Rule::unique('users', 'email'),
                ]
                : ['nullable', 'email', 'max:255'],

            'create_account' => ['sometimes', 'boolean'],

            'account_password' => $createAccount
                ? ['required', 'string', 'min:8', 'confirmed']
                : ['nullable', 'string', 'min:8', 'confirmed'],

            'address' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'boolean'],
            'photo' => ['nullable', 'image', 'max:2048'],

            'class_id' => ['nullable', 'integer', 'min:1'],
            'academic_session_id' => ['nullable', 'integer', 'min:1'],
            'term_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $hasEnrollmentData =
            $request->filled('class_id')
            || $request->filled('academic_session_id')
            || $request->filled('term_id');

        if ($hasEnrollmentData) {
            $request->validate([
                'class_id' => ['required', 'integer', 'min:1'],
                'academic_session_id' => ['required', 'integer', 'min:1'],
                'term_id' => ['required', 'integer', 'min:1'],
            ]);
        }

        $photoPath = null;

        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')
                ->store('students', 'public');
        }

        try {
            $student = DB::transaction(function () use (
                $validated,
                $schoolId,
                $hasEnrollmentData,
                $photoPath,
                $createAccount
            ) {
                $student = Student::create([
                    'school_id' => $schoolId,
                    'admission_number' => trim($validated['admission_number']),
                    'first_name' => trim($validated['first_name']),
                    'middle_name' => isset($validated['middle_name'])
                        ? trim($validated['middle_name'])
                        : null,
                    'last_name' => trim($validated['last_name']),
                    'gender' => $validated['gender'],
                    'date_of_birth' => $validated['date_of_birth'] ?? null,
                    'phone' => $validated['phone'] ?? null,
                    'email' => $validated['email'] ?? null,
                    'address' => $validated['address'] ?? null,
                    'status' => $validated['status'] ?? true,
                    'photo' => $photoPath,
                ]);

                if ($createAccount) {
                    $user = User::create([
                        'school_id' => $schoolId,
                        'name' => trim(
                            $validated['first_name'] . ' ' .
                            $validated['last_name']
                        ),
                        'email' => strtolower(trim($validated['email'])),
                        'password' => $validated['account_password'],
                        'status' => $validated['status'] ?? true,
                    ]);

                    $user->assignRole('Student');

                    $student->user()->associate($user);
                    $student->save();
                }

                if ($hasEnrollmentData) {
                    $this->createEnrollment(
                        $student,
                        $schoolId,
                        $validated
                    );
                }

                return $student;
            });
        } catch (\Throwable $exception) {
            if ($photoPath) {
                Storage::disk('public')->delete($photoPath);
            }

            throw $exception;
        }

        return response()->json([
            'success' => true,
            'message' => 'Student registered successfully.',
            'data' => $student->load([
                'user',
                'enrollments.schoolClass',
                'enrollments.academicSession',
                'enrollments.term',
            ]),
        ], 201);
    }

    /**
     * Show one student's profile and enrolment history.
     */
    public function show(Request $request, int $studentId): JsonResponse
    {
        $student = Student::where(
            'school_id',
            $request->user()->school_id
        )
            ->with([
                'enrollments.schoolClass',
                'enrollments.academicSession',
                'enrollments.term',
            ])
            ->findOrFail($studentId);

        return response()->json([
            'success' => true,
            'message' => 'Student retrieved successfully.',
            'data' => $student,
        ]);
    }

    /**
     * Update student details.
     */
    public function update(Request $request, int $studentId): JsonResponse
    {
        $schoolId = $request->user()->school_id;

        $student = Student::where('school_id', $schoolId)
            ->findOrFail($studentId);

        $validated = $request->validate([
            'admission_number' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('students', 'admission_number')
                    ->where('school_id', $schoolId)
                    ->ignore($student->id),
            ],
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'middle_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'gender' => ['sometimes', 'required', Rule::in(['Male', 'Female'])],
            'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:today'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'boolean'],
            'photo' => ['sometimes', 'nullable', 'image', 'max:2048'],
        ]);

        $oldPhoto = $student->photo;
        $newPhoto = null;

        if ($request->hasFile('photo')) {
            $newPhoto = $request->file('photo')
                ->store('students', 'public');

            $validated['photo'] = $newPhoto;
        }

        try {
            $student->fill($validated);
            $student->save();
        } catch (\Throwable $exception) {
            if ($newPhoto) {
                Storage::disk('public')->delete($newPhoto);
            }

            throw $exception;
        }

        if ($oldPhoto && $newPhoto && $oldPhoto !== $newPhoto) {
            Storage::disk('public')->delete($oldPhoto);
        }

        return response()->json([
            'success' => true,
            'message' => 'Student updated successfully.',
            'data' => $student->fresh()->load([
                'enrollments.schoolClass',
                'enrollments.academicSession',
                'enrollments.term',
            ]),
        ]);
    }

    /**
     * Activate or deactivate a student without deleting records.
     */
    public function updateStatus(
        Request $request,
        int $studentId
    ): JsonResponse {
        $validated = $request->validate([
            'status' => ['required', 'boolean'],
        ]);

        $student = Student::where(
            'school_id',
            $request->user()->school_id
        )->findOrFail($studentId);

        $student->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Student status updated successfully.',
            'data' => $student->fresh(),
        ]);
    }

    /**
     * View a student's enrolment history.
     */
    public function enrollments(
        Request $request,
        int $studentId
    ): JsonResponse {
        $student = Student::where(
            'school_id',
            $request->user()->school_id
        )->findOrFail($studentId);

        $enrollments = $student->enrollments()
            ->with([
                'schoolClass',
                'academicSession',
                'term',
            ])
            ->orderByDesc('is_current')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Student enrolments retrieved successfully.',
            'data' => $enrollments,
        ]);
    }

    /**
     * Enrol an existing student in a class, session and term.
     */
    public function storeEnrollment(
        Request $request,
        int $studentId
    ): JsonResponse {
        $schoolId = $request->user()->school_id;

        $student = Student::where('school_id', $schoolId)
            ->findOrFail($studentId);

        $validated = $request->validate([
            'class_id' => ['required', 'integer', 'min:1'],
            'academic_session_id' => ['required', 'integer', 'min:1'],
            'term_id' => ['required', 'integer', 'min:1'],
            'is_current' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'boolean'],
        ]);

        $enrollment = DB::transaction(function () use (
            $student,
            $schoolId,
            $validated
        ) {
            return $this->createEnrollment(
                $student,
                $schoolId,
                $validated
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Student enrolled successfully.',
            'data' => $enrollment->load([
                'schoolClass',
                'academicSession',
                'term',
            ]),
        ], 201);
    }

    /**
     * Validate and create an enrolment.
     */
    private function createEnrollment(
        Student $student,
        int $schoolId,
        array $data
    ): StudentClass {
        $class = SchoolClass::where('school_id', $schoolId)
            ->find($data['class_id']);

        if (!$class) {
            throw ValidationException::withMessages([
                'class_id' => 'The selected class does not belong to this school.',
            ]);
        }

        $session = AcademicSession::where('school_id', $schoolId)
            ->find($data['academic_session_id']);

        if (!$session) {
            throw ValidationException::withMessages([
                'academic_session_id' => 'The selected academic session does not belong to this school.',
            ]);
        }

        $term = Term::where('academic_session_id', $session->id)
            ->find($data['term_id']);

        if (!$term) {
            throw ValidationException::withMessages([
                'term_id' => 'The selected term does not belong to the selected academic session.',
            ]);
        }

        $isCurrent = (bool) ($data['is_current'] ?? true);
        $status = (bool) ($data['status'] ?? true);

        $duplicate = StudentClass::where('student_id', $student->id)
            ->where('class_id', $class->id)
            ->where('academic_session_id', $session->id)
            ->where('term_id', $term->id)
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'class_id' => 'This student is already enrolled in this class for the selected academic session and term.',
            ]);
        }

        if ($isCurrent) {
            StudentClass::where('student_id', $student->id)
                ->where('is_current', true)
                ->update(['is_current' => false]);
        }

        return StudentClass::create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_session_id' => $session->id,
            'term_id' => $term->id,
            'is_current' => $isCurrent,
            'status' => $status,
        ]);
    }
}
