<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StudentPortalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $user && $user->hasRole('Student'),
            403,
            'Student portal access only.'
        );

        $student = $user->student()
            ->where('school_id', $user->school_id)
            ->where('status', true)
            ->first();

        abort_unless(
            $student,
            404,
            'No active student profile is linked to this account.'
        );

        $currentEnrollment = $student->enrollments()
            ->where('is_current', true)
            ->where('status', true)
            ->with([
                'schoolClass',
                'academicSession',
                'term',
            ])
            ->latest('id')
            ->first();

        $results = $student->results()
            ->where('status', 'published')
            ->with([
                'schoolClass',
                'academicSession',
                'term',
                'details.subject',
            ])
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();

        $latestResult = $results->first();

        return response()->json([
            'success' => true,

            'data' => [
                'student' => [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'first_name' => $student->first_name,
                    'middle_name' => $student->middle_name,
                    'last_name' => $student->last_name,
                    'full_name' => $student->full_name,
                    'gender' => $student->gender,
                    'date_of_birth' => $student->date_of_birth,
                    'phone' => $student->phone,
                    'email' => $student->email,
                ],

                'current_enrollment' => $currentEnrollment,

                'summary' => [
                    'published_results_count' => $results->count(),
                    'current_class' => $currentEnrollment?->schoolClass?->name,
                    'academic_session' => $currentEnrollment?->academicSession?->name,
                    'current_term' => $currentEnrollment?->term?->name,
                    'latest_average' => $latestResult?->average,
                    'latest_position' => $latestResult?->position,
                    'latest_grade' => $latestResult?->overall_grade,
                    'latest_remark' => $latestResult?->overall_remark,
                ],

                'results' => $results,
            ],
        ]);
    }
}
