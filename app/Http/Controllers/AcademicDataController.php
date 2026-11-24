<?php

namespace App\Http\Controllers;

use App\Models\AcademicSession;
use App\Models\AssessmentComponent;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\Teacher;
use App\Models\TeacherSubject;
use App\Models\Term;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AcademicDataController extends Controller
{
    /**
     * Get active academic sessions for the authenticated user's school.
     */
    public function sessions(Request $request): JsonResponse
    {
        $user = $request->user();

        $sessions = AcademicSession::where('school_id', $user->school_id)
            ->where('status', true)
            ->orderByDesc('is_current')
            ->orderByDesc('start_date')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Academic sessions retrieved successfully.',
            'data' => $sessions,
        ]);
    }

    /**
     * Get active terms for an academic session.
     */
    public function terms(
        Request $request,
        int $academicSessionId
    ): JsonResponse {
        $user = $request->user();

        $session = AcademicSession::where('school_id', $user->school_id)
            ->findOrFail($academicSessionId);

        $terms = Term::where('academic_session_id', $session->id)
            ->where('status', true)
            ->orderByDesc('is_current')
            ->orderBy('start_date')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Terms retrieved successfully.',
            'data' => $terms,
        ]);
    }

    /**
     * Get active classes for the authenticated user's school.
     */
    public function classes(Request $request): JsonResponse
    {
        $user = $request->user();

        $classes = SchoolClass::with([
            'department',
            'classTeacher',
        ])
            ->where('school_id', $user->school_id)
            ->where('status', true)
            ->orderBy('level')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Classes retrieved successfully.',
            'data' => $classes,
        ]);
    }

    /**
     * Get active subjects assigned to a class.
     *
     * Optional query parameter:
     * academic_session_id
     */
    public function subjects(
        Request $request,
        int $classId
    ): JsonResponse {
        $user = $request->user();

        $class = SchoolClass::where('school_id', $user->school_id)
            ->where('status', true)
            ->findOrFail($classId);

        $query = $class->subjects()
            ->where('subjects.school_id', $user->school_id)
            ->where('subjects.status', true)
            ->with('department')
            ->orderBy('subjects.name');

        if ($request->filled('academic_session_id')) {
            $session = AcademicSession::where('school_id', $user->school_id)
                ->find($request->input('academic_session_id'));

            if (!$session) {
                throw ValidationException::withMessages([
                    'academic_session_id' =>
                        'The selected academic session is invalid.',
                ]);
            }

            $query->wherePivot(
                'academic_session_id',
                $session->id
            );
        }

        $subjects = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'Class subjects retrieved successfully.',
            'data' => $subjects,
        ]);
    }

    /**
     * Get active students enrolled in a class, session, and term.
     */
    public function students(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'class_id' => ['required', 'integer'],
            'academic_session_id' => ['required', 'integer'],
            'term_id' => ['required', 'integer'],
        ]);

        $class = SchoolClass::where('school_id', $user->school_id)
            ->where('status', true)
            ->findOrFail($validated['class_id']);

        AcademicSession::where('school_id', $user->school_id)
            ->findOrFail($validated['academic_session_id']);

        Term::where('academic_session_id', $validated['academic_session_id'])
            ->findOrFail($validated['term_id']);

        $students = Student::where('school_id', $user->school_id)
            ->where('status', true)
            ->whereHas('enrollments', function ($query) use ($validated) {
                $query->where('class_id', $validated['class_id'])
                    ->where(
                        'academic_session_id',
                        $validated['academic_session_id']
                    )
                    ->where('term_id', $validated['term_id'])
                    ->where('status', true);
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Students retrieved successfully.',
            'data' => $students,
            'class' => $class,
        ]);
    }

    /**
     * Get active assessment components for the authenticated user's school.
     */
    public function assessmentComponents(Request $request): JsonResponse
    {
        $user = $request->user();

        $components = AssessmentComponent::where(
            'school_id',
            $user->school_id
        )
            ->where('is_active', true)
            ->orderBy('display_order')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Assessment components retrieved successfully.',
            'data' => $components,
        ]);
    }

    /**
     * Get the authenticated user's linked teacher profile.
     */
    public function myTeacherProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $teacher = Teacher::with([
            'school',
            'user',
        ])
            ->where('school_id', $user->school_id)
            ->where('user_id', $user->id)
            ->where('status', true)
            ->first();

        if (!$teacher) {
            return response()->json([
                'success' => false,
                'message' => 'No active teacher profile is linked to your account.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Teacher profile retrieved successfully.',
            'data' => $teacher,
        ]);
    }

    /**
     * Get assignments belonging only to the authenticated teacher.
     */
    public function teacherAssignments(Request $request): JsonResponse
    {
        $user = $request->user();

        $teacher = Teacher::where('school_id', $user->school_id)
            ->where('user_id', $user->id)
            ->where('status', true)
            ->first();

        if (!$teacher) {
            return response()->json([
                'success' => false,
                'message' => 'No active teacher profile is linked to your account.',
            ], 403);
        }

        $query = TeacherSubject::with([
            'schoolClass',
            'subject',
            'academicSession',
        ])->where('teacher_id', $teacher->id);

        if ($request->filled('academic_session_id')) {
            $session = AcademicSession::where('school_id', $user->school_id)
                ->find($request->input('academic_session_id'));

            if (!$session) {
                throw ValidationException::withMessages([
                    'academic_session_id' =>
                        'The selected academic session is invalid.',
                ]);
            }

            $query->where('academic_session_id', $session->id);
        }

        $assignments = $query
            ->orderBy('class_id')
            ->orderBy('subject_id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Your teaching assignments retrieved successfully.',
            'data' => $assignments,
        ]);
    }

    /**
     * Get a student's active enrollments.
     */
    public function studentEnrollments(
        Request $request,
        int $studentId
    ): JsonResponse {
        $user = $request->user();

        $student = Student::where('school_id', $user->school_id)
            ->findOrFail($studentId);

        $enrollments = StudentClass::with([
            'schoolClass',
            'academicSession',
            'term',
        ])
            ->where('student_id', $student->id)
            ->where('status', true)
            ->orderByDesc('is_current')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Student enrollments retrieved successfully.',
            'data' => $enrollments,
        ]);
    }
}
