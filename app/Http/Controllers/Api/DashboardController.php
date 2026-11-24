<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Result;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->school_id) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is not associated with a school.',
            ], 403);
        }

        $schoolId = $user->school_id;

        $students = Student::where('school_id', $schoolId);
        $classes = SchoolClass::where('school_id', $schoolId);
        $subjects = Subject::where('school_id', $schoolId);

        $results = Result::whereHas('student', function ($query) use ($schoolId) {
            $query->where('school_id', $schoolId);
        });

        return response()->json([
            'success' => true,
            'message' => 'Dashboard statistics retrieved successfully.',
            'data' => [
                'students' => [
                    'total' => (clone $students)->count(),
                    'active' => (clone $students)->where('status', true)->count(),
                ],
                'classes' => [
                    'total' => (clone $classes)->count(),
                    'active' => (clone $classes)->where('status', true)->count(),
                ],
                'subjects' => [
                    'total' => (clone $subjects)->count(),
                    'active' => (clone $subjects)->where('status', true)->count(),
                ],
                'results' => [
                    'total' => (clone $results)->count(),
                    'published' => (clone $results)->where('status', 'PUBLISHED')->count(),
                    'approved' => (clone $results)->where('status', 'APPROVED')->count(),
                    'draft' => (clone $results)->where('status', 'DRAFT')->count(),
                ],
            ],
        ]);
    }
}
