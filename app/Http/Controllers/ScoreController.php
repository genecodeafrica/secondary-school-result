<?php

namespace App\Http\Controllers;

use App\Services\ScoreValidationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class ScoreController extends Controller
{
    /**
     * Store or update a student's assessment score.
     */
    public function store(
        Request $request,
        ScoreValidationService $scoreService
    ): JsonResponse {
        $validated = $request->validate([
            'student_id' => [
                'required',
                'integer',
                'exists:students,id',
            ],
            'class_id' => [
                'required',
                'integer',
                'exists:classes,id',
            ],
            'subject_id' => [
                'required',
                'integer',
                'exists:subjects,id',
            ],
            'academic_session_id' => [
                'required',
                'integer',
                'exists:academic_sessions,id',
            ],
            'term_id' => [
                'required',
                'integer',
                'exists:terms,id',
            ],
            'assessment_component_id' => [
                'required',
                'integer',
                'exists:assessment_components,id',
            ],
            'score' => [
                'required',
                'numeric',
                'min:0',
            ],
        ]);

        try {
            $score = $scoreService->saveScore(
                $request->user(),
                (int) $validated['student_id'],
                (int) $validated['subject_id'],
                (int) $validated['class_id'],
                (int) $validated['academic_session_id'],
                (int) $validated['term_id'],
                (int) $validated['assessment_component_id'],
                (float) $validated['score']
            );

            return response()->json([
                'success' => true,
                'message' => 'Score saved successfully.',
                'data' => $score->load([
                    'student',
                    'subject',
                    'schoolClass',
                    'academicSession',
                    'term',
                    'assessmentComponent',
                    'enteredBy',
                ]),
            ]);
        } catch (AuthorizationException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 403);
        } catch (RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        } catch (Throwable $exception) {
            Log::error('Score entry failed unexpectedly.', [
                'user_id' => $request->user()?->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred while saving the score.',
            ], 500);
        }
    }
}
