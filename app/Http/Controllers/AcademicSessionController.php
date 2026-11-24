<?php

namespace App\Http\Controllers;

use App\Models\AcademicSession;
use App\Models\Term;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AcademicSessionController extends Controller
{
    private function schoolId(Request $request): int
    {
        return (int) $request->user()->school_id;
    }

    private function authorizeManagement(Request $request): void
    {
        abort_unless(
            $request->user()->hasAnyRole(['School Admin', 'Super Admin']),
            403,
            'You are not authorized to manage academic sessions.'
        );
    }

    public function index(Request $request)
    {
        $this->authorizeManagement($request);

        $sessions = AcademicSession::where(
            'school_id',
            $this->schoolId($request)
        )
            ->with(['terms' => function ($query) {
                $query->orderBy('start_date');
            }])
            ->withCount('terms')
            ->orderByDesc('is_current')
            ->orderByDesc('start_date')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Academic sessions retrieved successfully.',
            'data' => $sessions,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeManagement($request);

        $schoolId = $this->schoolId($request);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('academic_sessions', 'name')
                    ->where('school_id', $schoolId),
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_current' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'boolean'],
        ]);

        $isCurrent = $validated['is_current'] ?? false;
        $status = $validated['status'] ?? true;

        if ($isCurrent && !$status) {
            return response()->json([
                'success' => false,
                'message' => 'An inactive session cannot be current.',
            ], 422);
        }

        $session = DB::transaction(function () use (
            $validated,
            $schoolId,
            $isCurrent,
            $status
        ) {
            if ($isCurrent) {
                AcademicSession::where('school_id', $schoolId)
                    ->update(['is_current' => false]);

                Term::whereHas('academicSession', function ($query) use ($schoolId) {
                    $query->where('school_id', $schoolId);
                })->update(['is_current' => false]);
            }

            return AcademicSession::create([
                'school_id' => $schoolId,
                'name' => trim($validated['name']),
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'is_current' => $isCurrent,
                'status' => $status,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Academic session created successfully.',
            'data' => $session->load('terms'),
        ], 201);
    }

    public function update(Request $request, int $academicSessionId)
    {
        $this->authorizeManagement($request);

        $session = $this->findSession($request, $academicSessionId);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('academic_sessions', 'name')
                    ->where('school_id', $this->schoolId($request))
                    ->ignore($session->id),
            ],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date'],
            'is_current' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'boolean'],
        ]);

        $startDate = $validated['start_date']
            ?? $session->start_date->toDateString();

        $endDate = $validated['end_date']
            ?? $session->end_date->toDateString();

        if ($endDate <= $startDate) {
            return response()->json([
                'success' => false,
                'message' => 'The session end date must be after its start date.',
            ], 422);
        }

        $isCurrent = $validated['is_current'] ?? $session->is_current;
        $status = $validated['status'] ?? $session->status;

        if ($isCurrent && !$status) {
            return response()->json([
                'success' => false,
                'message' => 'An inactive session cannot be current.',
            ], 422);
        }

        if (!$status && $session->is_current) {
            return response()->json([
                'success' => false,
                'message' => 'Select another current session before deactivating this one.',
            ], 422);
        }

        $hasOutOfRangeTerms = $session->terms()
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereDate('start_date', '<', $startDate)
                    ->orWhereDate('end_date', '>', $endDate);
            })
            ->exists();

        if ($hasOutOfRangeTerms) {
            return response()->json([
                'success' => false,
                'message' => 'The session dates cannot exclude existing terms. Update the term dates first.',
            ], 422);
        }

        DB::transaction(function () use (
            $session,
            $validated,
            $isCurrent,
            $status
        ) {
            if ($isCurrent) {
                AcademicSession::where('school_id', $session->school_id)
                    ->where('id', '!=', $session->id)
                    ->update(['is_current' => false]);

                Term::whereHas('academicSession', function ($query) use ($session) {
                    $query->where('school_id', $session->school_id)
                        ->where('id', '!=', $session->id);
                })->update(['is_current' => false]);
            }

            $session->update([
                ...$validated,
                'is_current' => $isCurrent,
                'status' => $status,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Academic session updated successfully.',
            'data' => $session->fresh()->load('terms'),
        ]);
    }

    public function updateStatus(Request $request, int $academicSessionId)
    {
        $this->authorizeManagement($request);

        $validated = $request->validate([
            'status' => ['required', 'boolean'],
        ]);

        $session = $this->findSession($request, $academicSessionId);

        if (!$validated['status'] && $session->is_current) {
            return response()->json([
                'success' => false,
                'message' => 'Select another current session before deactivating this one.',
            ], 422);
        }

        $session->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Academic session status updated successfully.',
            'data' => $session->fresh()->load('terms'),
        ]);
    }

    public function storeTerm(Request $request, int $academicSessionId)
    {
        $this->authorizeManagement($request);

        $session = $this->findSession($request, $academicSessionId);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('terms', 'name')
                    ->where('academic_session_id', $session->id),
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_current' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'boolean'],
        ]);

        $isCurrent = $validated['is_current'] ?? false;
        $status = $validated['status'] ?? true;

        if ($validated['start_date'] < $session->start_date->toDateString()
            || $validated['end_date'] > $session->end_date->toDateString()) {
            return response()->json([
                'success' => false,
                'message' => 'Term dates must fall within the academic session dates.',
            ], 422);
        }

        if ($isCurrent && (!$session->is_current || !$session->status)) {
            return response()->json([
                'success' => false,
                'message' => 'A term can only be current in the active current academic session.',
            ], 422);
        }

        if ($isCurrent && !$status) {
            return response()->json([
                'success' => false,
                'message' => 'An inactive term cannot be current.',
            ], 422);
        }

        $term = DB::transaction(function () use (
            $validated,
            $session,
            $isCurrent,
            $status
        ) {
            if ($isCurrent) {
                Term::whereHas('academicSession', function ($query) use ($session) {
                    $query->where('school_id', $session->school_id);
                })->update(['is_current' => false]);
            }

            return $session->terms()->create([
                'name' => trim($validated['name']),
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'is_current' => $isCurrent,
                'status' => $status,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Term created successfully.',
            'data' => $term,
        ], 201);
    }

    public function updateTerm(Request $request, int $termId)
    {
        $this->authorizeManagement($request);

        $term = $this->findTerm($request, $termId);
        $session = $term->academicSession;

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('terms', 'name')
                    ->where('academic_session_id', $session->id)
                    ->ignore($term->id),
            ],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date'],
            'is_current' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'boolean'],
        ]);

        $startDate = $validated['start_date']
            ?? $term->start_date->toDateString();

        $endDate = $validated['end_date']
            ?? $term->end_date->toDateString();

        if ($endDate <= $startDate) {
            return response()->json([
                'success' => false,
                'message' => 'The term end date must be after its start date.',
            ], 422);
        }

        if ($startDate < $session->start_date->toDateString()
            || $endDate > $session->end_date->toDateString()) {
            return response()->json([
                'success' => false,
                'message' => 'Term dates must fall within the academic session dates.',
            ], 422);
        }

        $isCurrent = $validated['is_current'] ?? $term->is_current;
        $status = $validated['status'] ?? $term->status;

        if ($isCurrent && (!$session->is_current || !$session->status || !$status)) {
            return response()->json([
                'success' => false,
                'message' => 'A term can only be current in the active current academic session.',
            ], 422);
        }

        if (!$status && $term->is_current) {
            return response()->json([
                'success' => false,
                'message' => 'Select another current term before deactivating this one.',
            ], 422);
        }

        DB::transaction(function () use ($term, $validated, $isCurrent) {
            if ($isCurrent) {
                Term::whereHas('academicSession', function ($query) use ($term) {
                    $query->where('school_id', $term->academicSession->school_id);
                })->where('id', '!=', $term->id)
                    ->update(['is_current' => false]);
            }

            $term->update([
                ...$validated,
                'is_current' => $isCurrent,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Term updated successfully.',
            'data' => $term->fresh(),
        ]);
    }

    public function updateTermStatus(Request $request, int $termId)
    {
        $this->authorizeManagement($request);

        $validated = $request->validate([
            'status' => ['required', 'boolean'],
        ]);

        $term = $this->findTerm($request, $termId);

        if (!$validated['status'] && $term->is_current) {
            return response()->json([
                'success' => false,
                'message' => 'Select another current term before deactivating this one.',
            ], 422);
        }

        $term->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Term status updated successfully.',
            'data' => $term->fresh(),
        ]);
    }

    private function findSession(
        Request $request,
        int $academicSessionId
    ): AcademicSession {
        return AcademicSession::where(
            'school_id',
            $this->schoolId($request)
        )->findOrFail($academicSessionId);
    }

    private function findTerm(Request $request, int $termId): Term
    {
        return Term::whereHas('academicSession', function ($query) use ($request) {
            $query->where('school_id', $this->schoolId($request));
        })->with('academicSession')->findOrFail($termId);
    }
}
