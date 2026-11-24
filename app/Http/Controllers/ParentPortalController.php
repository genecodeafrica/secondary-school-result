<?php

namespace App\Http\Controllers;

use App\Models\ParentModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentPortalController extends Controller
{
    /**
     * Return the authenticated parent's children and published results.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $user && $user->hasRole('Parent'),
            403,
            'Only parent accounts can access the parent portal.'
        );

        abort_unless(
            $user->school_id,
            403,
            'Your account is not assigned to a school.'
        );

        $parent = ParentModel::query()
            ->where('user_id', $user->id)
            ->where('school_id', $user->school_id)
            ->where('status', true)
            ->firstOrFail();

        $children = $parent->students()
            ->where('students.school_id', $user->school_id)
            ->with([
                'enrollments' => function ($query) {
                    $query->where('is_current', true)
                        ->where('status', true)
                        ->with([
                            'schoolClass',
                            'academicSession',
                            'term',
                        ]);
                },

                'results' => function ($query) {
                    $query->where('status', 'published')
                        ->with([
                            'schoolClass',
                            'academicSession',
                            'term',
                            'details.subject',
                        ])
                        ->orderByDesc('published_at');
                },
            ])
            ->orderBy('students.first_name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Parent portal data retrieved successfully.',
            'data' => [
                'parent' => [
                    'id' => $parent->id,
                    'first_name' => $parent->first_name,
                    'last_name' => $parent->last_name,
                    'full_name' => trim(
                        $parent->first_name . ' ' . $parent->last_name
                    ),
                    'email' => $parent->email,
                    'phone' => $parent->phone,
                    'relationship' => $parent->relationship,
                ],

                'summary' => [
                    'children_count' => $children->count(),
                    'published_results_count' => $children
                        ->sum(fn ($child) => $child->results->count()),
                ],

                'children' => $children,
            ],
        ]);
    }
}
