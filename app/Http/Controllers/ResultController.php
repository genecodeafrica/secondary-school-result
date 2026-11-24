<?php

namespace App\Http\Controllers;

use App\Models\ParentModel;
use App\Models\Result;
use App\Models\ResultDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResultController extends Controller
{
    /**
     * Build a result query restricted to records the user may access.
     */
    private function accessibleResultsQuery($user)
    {
        $query = Result::query();

        if ($user->hasRole('Student')) {
            $student = $user->student;

            if (!$student || $student->school_id !== $user->school_id) {
                return $query->whereRaw('1 = 0');
            }

            return $query
                ->where('student_id', $student->id)
                ->where('status', 'published');
        }

        if ($user->hasRole('Parent')) {
            $parent = $user->parent;

            if (!$parent || $parent->school_id !== $user->school_id) {
                return $query->whereRaw('1 = 0');
            }

            $studentIds = $parent->students()
                ->where('students.school_id', $user->school_id)
                ->select('students.id');

            return $query
                ->whereIn('student_id', $studentIds)
                ->where('status', 'published');
        }

        if (!$user->can('results.view')) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereHas('student', function ($studentQuery) use ($user) {
            $studentQuery->where('school_id', $user->school_id);
        });
    }

    /**
     * Check general result viewing permission.
     */
    private function canViewResults($user): bool
    {
        return $user->can('results.view');
    }

    /**
     * Get one student's result.
     */
    public function show(Request $request, int $resultId): JsonResponse
    {
        $user = $request->user();

        if (!$this->canViewResults($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to view results.',
            ], 403);
        }

        $result = $this->accessibleResultsQuery($user)
            ->with([
                'student',
                'schoolClass',
                'academicSession',
                'term',
                'approvedBy',
                'details.subject',
            ])
            ->findOrFail($resultId);

        return response()->json([
            'success' => true,
            'message' => 'Result retrieved successfully.',
            'data' => $result,
        ]);
    }

    /**
     * Get results for a class.
     * Student and Parent accounts cannot access class-wide results.
     */
    public function classResults(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            $user->hasAnyRole(['Student', 'Parent']) ||
            !$this->canViewResults($user)
        ) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to view class results.',
            ], 403);
        }

        $validated = $request->validate([
            'class_id' => ['required', 'integer'],
            'academic_session_id' => ['required', 'integer'],
            'term_id' => ['required', 'integer'],
        ]);

        $results = $this->accessibleResultsQuery($user)
            ->with([
                'student',
                'schoolClass',
                'academicSession',
                'term',
            ])
            ->where('class_id', $validated['class_id'])
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('term_id', $validated['term_id'])
            ->orderBy('position')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Class results retrieved successfully.',
            'data' => $results,
        ]);
    }

    /**
     * Get a student's result using student/session/term.
     */
    public function studentResult(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$this->canViewResults($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to view results.',
            ], 403);
        }

        $validated = $request->validate([
            'student_id' => ['required', 'integer'],
            'class_id' => ['required', 'integer'],
            'academic_session_id' => ['required', 'integer'],
            'term_id' => ['required', 'integer'],
        ]);

        $result = $this->accessibleResultsQuery($user)
            ->with([
                'student',
                'schoolClass',
                'academicSession',
                'term',
                'approvedBy',
                'details.subject',
            ])
            ->where('student_id', $validated['student_id'])
            ->where('class_id', $validated['class_id'])
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('term_id', $validated['term_id'])
            ->first();

        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Result not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Student result retrieved successfully.',
            'data' => $result,
        ]);
    }

    /**
     * Get result details for a result.
     */
    public function details(Request $request, int $resultId): JsonResponse
    {
        $user = $request->user();

        if (!$this->canViewResults($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to view results.',
            ], 403);
        }

        $result = $this->accessibleResultsQuery($user)
            ->findOrFail($resultId);

        $details = ResultDetail::with([
            'subject',
            'student',
            'result',
        ])
            ->where('result_id', $result->id)
            ->orderBy('subject_position')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Result details retrieved successfully.',
            'data' => $details,
        ]);
    }
}
