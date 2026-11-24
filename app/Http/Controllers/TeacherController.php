<?php

namespace App\Http\Controllers;

use App\Models\AcademicSession;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherSubject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TeacherController extends Controller
{
    private function schoolId(Request $request): int
    {
        return (int) $request->user()->school_id;
    }

    /**
     * List teachers belonging to the logged-in user's school.
     */
    public function index(Request $request)
    {
        $schoolId = $this->schoolId($request);

        $query = Teacher::where('school_id', $schoolId)
            ->with('user')
            ->withCount('assignments');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($builder) use ($search) {
                $builder->where('teacher_id', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $status = filter_var(
                $request->input('status'),
                FILTER_VALIDATE_BOOLEAN
            );

            $query->where('status', $status);
        }

        $teachers = $query
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(
                min(max((int) $request->input('per_page', 15), 1), 100)
            );

        return response()->json([
            'success' => true,
            'message' => 'Teachers retrieved successfully.',
            'data' => $teachers,
        ]);
    }

    /**
     * Register a teacher and create their login account.
     */
    public function store(Request $request)
    {
        $schoolId = $this->schoolId($request);

        $validated = $request->validate([
            'teacher_id' => [
                'required',
                'string',
                'max:255',
                Rule::unique('teachers', 'teacher_id'),
            ],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'status' => ['sometimes', 'boolean'],
        ]);

        $teacher = DB::transaction(function () use ($validated, $schoolId) {
            $firstName = trim($validated['first_name']);
            $middleName = isset($validated['middle_name'])
                ? trim($validated['middle_name'])
                : '';
            $lastName = trim($validated['last_name']);

            $user = User::create([
                'school_id' => $schoolId,
                'name' => trim("$firstName $middleName $lastName"),
                'email' => strtolower(trim($validated['email'])),
                'password' => $validated['password'],
                'status' => $validated['status'] ?? true,
            ]);

            $user->assignRole('Teacher');

            return Teacher::create([
                'school_id' => $schoolId,
                'user_id' => $user->id,
                'teacher_id' => strtoupper(trim($validated['teacher_id'])),
                'first_name' => $firstName,
                'middle_name' => $middleName !== '' ? $middleName : null,
                'last_name' => $lastName,
                'phone' => $validated['phone'] ?? null,
                'status' => $validated['status'] ?? true,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Teacher and login account created successfully.',
            'data' => $teacher->load('user'),
        ], 201);
    }

    /**
     * Show a teacher's details and assignments.
     */
    public function show(Request $request, int $teacherId)
    {
        $teacher = $this->findTeacher($request, $teacherId);

        $teacher->load([
            'user',
            'assignments.schoolClass',
            'assignments.subject',
            'assignments.academicSession',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Teacher retrieved successfully.',
            'data' => $teacher,
        ]);
    }

    /**
     * Update teacher details and their linked login account.
     */
    public function update(Request $request, int $teacherId)
    {
        $teacher = $this->findTeacher($request, $teacherId);

        $validated = $request->validate([
            'teacher_id' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('teachers', 'teacher_id')->ignore($teacher->id),
            ],
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'middle_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($teacher->user_id),
            ],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
            'status' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($teacher, $validated) {
            $teacherData = [];

            foreach (
                ['teacher_id', 'first_name', 'middle_name', 'last_name', 'phone', 'status']
                as $field
            ) {
                if (array_key_exists($field, $validated)) {
                    $teacherData[$field] = $validated[$field];
                }
            }

            if (isset($teacherData['teacher_id'])) {
                $teacherData['teacher_id'] = strtoupper(trim($teacherData['teacher_id']));
            }

            foreach (['first_name', 'middle_name', 'last_name'] as $field) {
                if (isset($teacherData[$field])) {
                    $teacherData[$field] = trim($teacherData[$field]);
                }
            }

            $teacher->update($teacherData);

            $user = $teacher->user;

            if ($user) {
                $userData = [];

                if (
                    isset($validated['first_name'])
                    || array_key_exists('middle_name', $validated)
                    || isset($validated['last_name'])
                ) {
                    $first = $validated['first_name'] ?? $teacher->first_name;

                    $middle = array_key_exists('middle_name', $validated)
                        ? ($validated['middle_name'] ?? '')
                        : ($teacher->middle_name ?? '');

                    $last = $validated['last_name'] ?? $teacher->last_name;

                    $userData['name'] = trim(
                        trim($first) . ' ' . trim($middle) . ' ' . trim($last)
                    );
                }

                if (isset($validated['email'])) {
                    $userData['email'] = strtolower(trim($validated['email']));
                }

                if (!empty($validated['password'])) {
                    $userData['password'] = $validated['password'];
                }

                if (array_key_exists('status', $validated)) {
                    $userData['status'] = $validated['status'];
                }

                if ($userData) {
                    $user->update($userData);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Teacher updated successfully.',
            'data' => $teacher->fresh()->load('user'),
        ]);
    }

    /**
     * Activate or deactivate a teacher and their login account.
     */
    public function updateStatus(Request $request, int $teacherId)
    {
        $validated = $request->validate([
            'status' => ['required', 'boolean'],
        ]);

        $teacher = $this->findTeacher($request, $teacherId);

        DB::transaction(function () use ($teacher, $validated) {
            $teacher->update(['status' => $validated['status']]);

            if ($teacher->user) {
                $teacher->user->update(['status' => $validated['status']]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Teacher status updated successfully.',
            'data' => $teacher->fresh()->load('user'),
        ]);
    }

    /**
     * Get assignments, optionally filtered by academic session.
     */
    public function assignments(Request $request, int $teacherId)
    {
        $schoolId = $this->schoolId($request);
        $teacher = $this->findTeacher($request, $teacherId);

        $validated = $request->validate([
            'academic_session_id' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = TeacherSubject::where('teacher_id', $teacher->id)
            ->with(['schoolClass', 'subject', 'academicSession']);

        if (isset($validated['academic_session_id'])) {
            $sessionExists = AcademicSession::where('school_id', $schoolId)
                ->whereKey($validated['academic_session_id'])
                ->exists();

            if (!$sessionExists) {
                throw ValidationException::withMessages([
                    'academic_session_id' =>
                        'The selected academic session does not belong to this school.',
                ]);
            }

            $query->where(
                'academic_session_id',
                $validated['academic_session_id']
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Teacher assignments retrieved successfully.',
            'data' => $query->orderBy('class_id')->get(),
        ]);
    }

    /**
     * Replace a teacher's assignments for one academic session only.
     */
    public function syncAssignments(Request $request, int $teacherId)
    {
        $schoolId = $this->schoolId($request);
        $teacher = $this->findTeacher($request, $teacherId);

        $validated = $request->validate([
            'academic_session_id' => ['required', 'integer', 'min:1'],
            'assignments' => ['present', 'array'],
            'assignments.*.class_id' => [
                'required',
                'integer',
                'min:1',
                'distinct',
            ],
            'assignments.*.subject_ids' => ['present', 'array'],
            'assignments.*.subject_ids.*' => [
                'required',
                'integer',
                'min:1',
            ],
        ]);

        $session = AcademicSession::where('school_id', $schoolId)
            ->find($validated['academic_session_id']);

        if (!$session) {
            throw ValidationException::withMessages([
                'academic_session_id' =>
                    'The selected academic session does not belong to this school.',
            ]);
        }

        // Validate that all selected classes belong to this school.
        $classIds = collect($validated['assignments'])
            ->pluck('class_id')
            ->unique()
            ->values();

        $validClassIds = SchoolClass::where('school_id', $schoolId)
            ->whereIn('id', $classIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($validClassIds) !== $classIds->count()) {
            throw ValidationException::withMessages([
                'assignments' =>
                    'One or more selected classes do not belong to this school.',
            ]);
        }

        // Validate that all selected subjects belong to this school.
        $subjectIds = collect($validated['assignments'])
            ->flatMap(fn ($assignment) => $assignment['subject_ids'])
            ->unique()
            ->values();

        $validSubjectIds = Subject::where('school_id', $schoolId)
            ->whereIn('id', $subjectIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($validSubjectIds) !== $subjectIds->count()) {
            throw ValidationException::withMessages([
                'assignments' =>
                    'One or more selected subjects do not belong to this school.',
            ]);
        }

        // Allow the same subject in different classes,
        // but reject duplicate subject IDs within one class.
        foreach ($validated['assignments'] as $assignment) {
            $classId = (int) $assignment['class_id'];

            $classSubjectIds = array_map(
                'intval',
                $assignment['subject_ids']
            );

            if (
                count($classSubjectIds) !==
                count(array_unique($classSubjectIds))
            ) {
                throw ValidationException::withMessages([
                    'assignments' =>
                        "Duplicate subjects were selected for class ID {$classId}.",
                ]);
            }

            // Confirm each subject is assigned to this class
            // for the selected academic session.
            foreach ($classSubjectIds as $subjectId) {
                $classSubjectExists = DB::table('class_subjects')
                    ->where('class_id', $classId)
                    ->where('subject_id', $subjectId)
                    ->where('academic_session_id', $session->id)
                    ->exists();

                if (!$classSubjectExists) {
                    throw ValidationException::withMessages([
                        'assignments' =>
                            "Subject ID {$subjectId} is not assigned to class ID {$classId} for the selected session.",
                    ]);
                }
            }
        }

        // Save assignments transactionally.
        DB::transaction(function () use ($teacher, $session, $validated) {
            // Delete assignments for this session only.
            // Other academic sessions are preserved.
            TeacherSubject::where('teacher_id', $teacher->id)
                ->where('academic_session_id', $session->id)
                ->delete();

            foreach ($validated['assignments'] as $assignment) {
                foreach ($assignment['subject_ids'] as $subjectId) {
                    TeacherSubject::create([
                        'teacher_id' => $teacher->id,
                        'class_id' => $assignment['class_id'],
                        'subject_id' => $subjectId,
                        'academic_session_id' => $session->id,
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Teacher assignments saved successfully.',
            'data' => $this->assignmentQuery($teacher, $session->id)->get(),
        ]);
    }

    /**
     * Build the assignment query for a teacher and session.
     */
    private function assignmentQuery(Teacher $teacher, int $sessionId)
    {
        return TeacherSubject::where('teacher_id', $teacher->id)
            ->where('academic_session_id', $sessionId)
            ->with(['schoolClass', 'subject', 'academicSession'])
            ->orderBy('class_id')
            ->orderBy('subject_id');
    }

    /**
     * Find a teacher belonging to the authenticated user's school.
     */
    private function findTeacher(Request $request, int $teacherId): Teacher
    {
        return Teacher::where('school_id', $this->schoolId($request))
            ->findOrFail($teacherId);
    }
}
