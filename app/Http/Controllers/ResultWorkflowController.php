<?php

namespace App\Http\Controllers;

use App\Models\Result;
use App\Services\ResultWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ResultWorkflowController extends Controller
{
    public function submit(
        Request $request,
        ResultWorkflowService $workflow
    ): JsonResponse {
        return $this->execute($request, $workflow, 'submit');
    }

    public function review(
        Request $request,
        ResultWorkflowService $workflow
    ): JsonResponse {
        return $this->execute($request, $workflow, 'startReview');
    }

    public function approve(
        Request $request,
        ResultWorkflowService $workflow
    ): JsonResponse {
        return $this->execute($request, $workflow, 'approve');
    }

    public function reject(
        Request $request,
        ResultWorkflowService $workflow
    ): JsonResponse {
        $validated = $request->validate([
            'result_id' => [
                'required',
                'integer',
                'exists:results,id',
            ],
            'reason' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        try {
            $result = Result::findOrFail($validated['result_id']);

            // Correct order: User first, Result second.
            $result = $workflow->reject(
                $request->user(),
                $result,
                $validated['reason'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Result rejected and returned to draft.',
                'data' => $result,
            ]);

        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    public function publish(
        Request $request,
        ResultWorkflowService $workflow
    ): JsonResponse {
        return $this->execute($request, $workflow, 'publish');
    }

    protected function execute(
        Request $request,
        ResultWorkflowService $workflow,
        string $method
    ): JsonResponse {
        $validated = $request->validate([
            'result_id' => [
                'required',
                'integer',
                'exists:results,id',
            ],
        ]);

        try {
            $result = Result::findOrFail($validated['result_id']);

            // Correct order: User first, Result second.
            $result = $workflow->{$method}(
                $request->user(),
                $result
            );

            return response()->json([
                'success' => true,
                'message' => $this->successMessage($method),
                'data' => $result,
            ]);

        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    protected function successMessage(string $method): string
    {
        return match ($method) {
            'submit' => 'Result submitted successfully for review.',
            'startReview' => 'Result moved to under review.',
            'approve' => 'Result approved successfully.',
            'publish' => 'Result published successfully.',
            default => 'Result workflow action completed successfully.',
        };
    }
}
