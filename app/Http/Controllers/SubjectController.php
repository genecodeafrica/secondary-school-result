<?php

namespace App\Http\Controllers;

use App\Models\AcademicSession;
use App\Models\Department;
use App\Models\SchoolClass;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SubjectController extends Controller
{
    private function schoolId(Request $request): int
    {
        return (int) $request->user()->school_id;
    }

    public function index(Request $request)
    {
        $schoolId = $this->schoolId($request);

        $query = Subject::with('department')
            ->withCount('classes')
            ->where('school_id', $schoolId);

        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('status')) {
            $query->where('status', filter_var(
                $request->status,
                FILTER_VALIDATE_BOOLEAN
            ));
        }

        $subjects = $query->orderBy('name')->paginate(
            min(max((int) $request->input('per_page', 15), 1), 100)
        );

        return response()->json([
            'success' => true,
            'message' => 'Subjects retrieved successfully.',
            'data' => $subjects,
        ]);
    }

    public function store(Request $request)
    {
        $schoolId = $this->schoolId($request);

        $validated = $request->validate([
            'code' => [
                'required', 'string', 'max:255',
                Rule::unique('subjects', 'code')
                    ->where('school_id', $schoolId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'department_id' => [
                'nullable',
                'integer',
                Rule::exists('departments', 'id')
                    ->where('school_id', $schoolId),
            ],
            'category' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'boolean'],
        ]);

        $subject = Subject::create([
            ...$validated,
            'school_id' => $schoolId,
            'code' => strtoupper(trim($validated['code'])),
            'name' => trim($validated['name']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject created successfully.',
            'data' => $subject->load('department'),
        ], 201);
    }

    public function show(Request $request, int $subjectId)
    {
        $subject = $this->findSubject($request, $subjectId);

        $subject->load([
            'department',
            'classes' => function ($query) {
                $query->with('department');
            },
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject retrieved successfully.',
            'data' => $subject,
        ]);
    }

    public function update(Request $request, int $subjectId)
    {
        $schoolId = $this->schoolId($request);
        $subject = $this->findSubject($request, $subjectId);

        $validated = $request->validate([
            'code' => [
                'sometimes', 'required', 'string', 'max:255',
                Rule::unique('subjects', 'code')
                    ->where('school_id', $schoolId)
                    ->ignore($subject->id),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'department_id' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('departments', 'id')
                    ->where('school_id', $schoolId),
            ],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $subject->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Subject updated successfully.',
            'data' => $subject->fresh()->load('department'),
        ]);
    }

    public function updateStatus(Request $request, int $subjectId)
    {
        $validated = $request->validate([
            'status' => ['required', 'boolean'],
        ]);

        $subject = $this->findSubject($request, $subjectId);
        $subject->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Subject status updated successfully.',
            'data' => $subject->fresh()->load('department'),
        ]);
    }

    public function assignments(Request $request, int $subjectId)
    {
        $subject = $this->findSubject($request, $subjectId);

        $classes = $subject->classes()
            ->where('classes.school_id', $this->schoolId($request))
            ->with('department')
            ->orderBy('classes.name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Subject class assignments retrieved successfully.',
            'data' => $classes,
        ]);
    }

    public function syncAssignments(Request $request, int $subjectId)
    {
        $schoolId = $this->schoolId($request);
        $subject = $this->findSubject($request, $subjectId);

        $validated = $request->validate([
            'academic_session_id' => [
                'required', 'integer',
                Rule::exists('academic_sessions', 'id')
                    ->where('school_id', $schoolId),
            ],
            'class_ids' => ['present', 'array'],
            'class_ids.*' => [
                'required', 'integer', 'distinct',
                Rule::exists('classes', 'id')
                    ->where('school_id', $schoolId),
            ],
        ]);

        $session = AcademicSession::where('school_id', $schoolId)
            ->findOrFail($validated['academic_session_id']);

        $classIds = SchoolClass::where('school_id', $schoolId)
            ->whereIn('id', $validated['class_ids'])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($classIds) !== count($validated['class_ids'])) {
            return response()->json([
                'success' => false,
                'message' => 'One or more selected classes are invalid.',
            ], 422);
        }

        DB::transaction(function () use (
            $subject,
            $session,
            $classIds
        ) {
            $subject->classes()->wherePivot(
                'academic_session_id',
                $session->id
            )->detach();

            foreach ($classIds as $classId) {
                $subject->classes()->attach($classId, [
                    'academic_session_id' => $session->id,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Class-subject assignments saved successfully.',
            'data' => [
                'subject_id' => $subject->id,
                'academic_session_id' => $session->id,
                'class_ids' => $classIds,
            ],
        ]);
    }

    private function findSubject(
        Request $request,
        int $subjectId
    ): Subject {
        return Subject::where('school_id', $this->schoolId($request))
            ->findOrFail($subjectId);
    }
}
