<?php

namespace App\Http\Controllers;

use App\Models\AssessmentComponent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AssessmentComponentController extends Controller
{
    private function authorizeSchoolAdmin(Request $request): int
    {
        $user = $request->user();

        abort_unless(
            $user && $user->hasAnyRole(['School Admin', 'Super Admin']),
            403,
            'Only school administrators can manage assessment components.'
        );

        abort_unless(
            $user->school_id,
            403,
            'Your account is not assigned to a school.'
        );

        return (int) $user->school_id;
    }

    private function components(int $schoolId)
    {
        return AssessmentComponent::where('school_id', $schoolId)
            ->withCount('scores')
            ->orderBy('display_order')
            ->orderBy('id');
    }

    private function validateTotal(
        int $schoolId,
        float $maximumScore,
        float $weight,
        ?int $ignoreId = null
    ): void {
        $query = AssessmentComponent::where('school_id', $schoolId)
            ->where('is_active', true);

        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        $maximumTotal = (float) $query->sum('maximum_score');
        $weightTotal = (float) $query->sum('weight');

        if (round($maximumTotal + $maximumScore, 2) > 100 ||
            round($weightTotal + $weight, 2) > 100) {
            throw ValidationException::withMessages([
                'maximum_score' => 'Active assessment maximum scores and weights cannot exceed 100.',
            ]);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $schoolId = $this->authorizeSchoolAdmin($request);

        $components = $this->components($schoolId)->get();

        return response()->json([
            'success' => true,
            'message' => 'Assessment components retrieved successfully.',
            'data' => $components,
            'summary' => [
                'total' => $components->count(),
                'active' => $components->where('is_active', true)->count(),
                'maximum_total' => (float) $components
                    ->where('is_active', true)->sum('maximum_score'),
                'weight_total' => (float) $components
                    ->where('is_active', true)->sum('weight'),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $schoolId = $this->authorizeSchoolAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required', 'string', 'max:50',
                Rule::unique('assessment_components', 'code')
                    ->where('school_id', $schoolId),
            ],
            'maximum_score' => ['required', 'numeric', 'min:0.01', 'max:100'],
            'weight' => ['required', 'numeric', 'min:0.01', 'max:100'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $active = $validated['is_active'] ?? true;

        if ($active) {
            $this->validateTotal(
                $schoolId,
                (float) $validated['maximum_score'],
                (float) $validated['weight']
            );
        }

        $component = AssessmentComponent::create([
            ...$validated,
            'school_id' => $schoolId,
            'is_active' => $active,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Assessment component created successfully.',
            'data' => $component->loadCount('scores'),
        ], 201);
    }

    public function update(
        Request $request,
        int $componentId
    ): JsonResponse {
        $schoolId = $this->authorizeSchoolAdmin($request);

        $component = AssessmentComponent::where('school_id', $schoolId)
            ->findOrFail($componentId);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required', 'string', 'max:50',
                Rule::unique('assessment_components', 'code')
                    ->where('school_id', $schoolId)
                    ->ignore($component->id),
            ],
            'maximum_score' => ['required', 'numeric', 'min:0.01', 'max:100'],
            'weight' => ['required', 'numeric', 'min:0.01', 'max:100'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if ($component->scores()->exists() &&
            (float) $validated['maximum_score'] !== (float) $component->maximum_score) {
            throw ValidationException::withMessages([
                'maximum_score' => 'This component already has saved scores. Its maximum score cannot be changed.',
            ]);
        }

        if ($component->is_active) {
            $this->validateTotal(
                $schoolId,
                (float) $validated['maximum_score'],
                (float) $validated['weight'],
                $component->id
            );
        }

        $component->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Assessment component updated successfully.',
            'data' => $component->fresh()->loadCount('scores'),
        ]);
    }

    public function updateStatus(
        Request $request,
        int $componentId
    ): JsonResponse {
        $schoolId = $this->authorizeSchoolAdmin($request);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $component = AssessmentComponent::where('school_id', $schoolId)
            ->findOrFail($componentId);

        if (!$validated['is_active'] &&
            $component->scores()->exists()) {
            throw ValidationException::withMessages([
                'is_active' => 'This component has saved scores and cannot be deactivated.',
            ]);
        }

        if ($validated['is_active'] && !$component->is_active) {
            $this->validateTotal(
                $schoolId,
                (float) $component->maximum_score,
                (float) $component->weight
            );
        }

        $component->update([
            'is_active' => $validated['is_active'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Assessment component status updated successfully.',
            'data' => $component->fresh()->loadCount('scores'),
        ]);
    }
}
