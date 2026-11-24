<?php

namespace App\Http\Controllers;

use App\Models\AcademicSession;
use App\Models\Result;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\Term;
use App\Services\ResultProcessingService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ResultProcessingController extends Controller
{
    private function authorizeProcessing(Request $request): int
    {
        $user = $request->user();

        if (!$user || !$user->can('results.process')) {
            throw new AuthorizationException(
                'You do not have permission to process results.'
            );
        }

        if (!$user->school_id) {
            throw new AuthorizationException(
                'Your account is not associated with a school.'
            );
        }

        return (int) $user->school_id;
    }

    private function validateAcademicScope(
        int $schoolId,
        int $classId,
        int $sessionId,
        int $termId
    ): void {
        $class = SchoolClass::where('school_id', $schoolId)
            ->find($classId);

        if (!$class) {
            throw new AuthorizationException(
                'The selected class does not belong to your school.'
            );
        }

        $session = AcademicSession::where('school_id', $schoolId)
            ->find($sessionId);

        if (!$session) {
            throw new AuthorizationException(
                'The selected academic session does not belong to your school.'
            );
        }

        $term = Term::where('academic_session_id', $sessionId)
            ->find($termId);

        if (!$term) {
            throw new AuthorizationException(
                'The selected term does not belong to the selected academic session.'
            );
        }
    }

    public function process(
        Request $request,
        ResultProcessingService $service
    ): JsonResponse {
        $schoolId = $this->authorizeProcessing($request);

        $validated = $request->validate([
            'student_id' => ['required', 'integer'],
            'class_id' => ['required', 'integer'],
            'academic_session_id' => ['required', 'integer'],
            'term_id' => ['required', 'integer'],
        ]);

        try {
            $this->validateAcademicScope(
                $schoolId,
                (int) $validated['class_id'],
                (int) $validated['academic_session_id'],
                (int) $validated['term_id']
            );

            $student = Student::where('school_id', $schoolId)
                ->find($validated['student_id']);

            if (!$student) {
                throw new AuthorizationException(
                    'The selected student does not belong to your school.'
                );
            }

            $result = $service->processStudentResult(
                $student,
                (int) $validated['class_id'],
                (int) $validated['academic_session_id'],
                (int) $validated['term_id']
            );

            return response()->json([
                'success' => true,
                'message' => 'Student result processed successfully.',
                'data' => $result,
            ]);
        } catch (AuthorizationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    /**
     * Process all eligible students in a selected class.
     */
    public function processClass(
        Request $request,
        ResultProcessingService $service
    ): JsonResponse {
        $schoolId = $this->authorizeProcessing($request);

        $validated = $request->validate([
            'class_id' => ['required', 'integer'],
            'academic_session_id' => ['required', 'integer'],
            'term_id' => ['required', 'integer'],
        ]);

        $classId = (int) $validated['class_id'];
        $sessionId = (int) $validated['academic_session_id'];
        $termId = (int) $validated['term_id'];

        $this->validateAcademicScope(
            $schoolId,
            $classId,
            $sessionId,
            $termId
        );

        $enrollments = StudentClass::query()
            ->with('student')
            ->where('class_id', $classId)
            ->where('academic_session_id', $sessionId)
            ->where('term_id', $termId)
            ->where('status', true)
            ->whereHas('student', function ($query) use ($schoolId) {
                $query->where('school_id', $schoolId);
            })
            ->orderBy('student_id')
            ->get();

        if ($enrollments->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No active student enrollments were found for the selected class and term.',
            ], 422);
        }

        $processed = 0;
        $skipped = 0;
        $failed = 0;
        $errors = [];

        foreach ($enrollments as $enrollment) {
            $student = $enrollment->student;

            if (!$student) {
                $skipped++;
                continue;
            }

            try {
                $existingResult = Result::query()
                    ->where('student_id', $student->id)
                    ->where('class_id', $classId)
                    ->where('academic_session_id', $sessionId)
                    ->where('term_id', $termId)
                    ->first();

                if (
                    $existingResult
                    && $existingResult->status !== 'draft'
                ) {
                    $skipped++;
                    continue;
                }

                $service->processStudentResult(
                    $student,
                    $classId,
                    $sessionId,
                    $termId
                );

                $processed++;
            } catch (Throwable $exception) {
                $failed++;

                $errors[] = [
                    'student_id' => $student->id,
                    'student_name' => $student->full_name
                        ?? $student->name
                        ?? ('Student #' . $student->id),
                    'message' => $exception->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Class result processing completed.',
            'data' => [
                'total_students' => $enrollments->count(),
                'processed' => $processed,
                'skipped' => $skipped,
                'failed' => $failed,
                'errors' => $errors,
            ],
        ]);
    }

    public function calculatePositions(
        Request $request,
        ResultProcessingService $service
    ): JsonResponse {
        $schoolId = $this->authorizeProcessing($request);

        $validated = $request->validate([
            'class_id' => ['required', 'integer'],
            'academic_session_id' => ['required', 'integer'],
            'term_id' => ['required', 'integer'],
        ]);

        try {
            $this->validateAcademicScope(
                $schoolId,
                (int) $validated['class_id'],
                (int) $validated['academic_session_id'],
                (int) $validated['term_id']
            );

            $service->calculatePositions(
                (int) $validated['class_id'],
                (int) $validated['academic_session_id'],
                (int) $validated['term_id']
            );

            return response()->json([
                'success' => true,
                'message' => 'Class positions calculated successfully.',
            ]);
        } catch (AuthorizationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }
}
