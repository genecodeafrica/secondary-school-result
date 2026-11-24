<?php

namespace App\Http\Controllers;

use App\Models\AssessmentComponent;
use App\Models\Result;
use App\Models\Score;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportCardController extends Controller
{
    public function download(Request $request, int $resultId)
    {
        $user = $request->user();

        abort_unless(
            $user && $user->school_id,
            403,
            'You are not authorized to view results.'
        );

        $query = Result::query();

        /*
         * STUDENT ACCESS
         * Students can download only their own published results.
         */
        if ($user->hasRole('Student')) {
            $student = $user->student()
                ->where('school_id', $user->school_id)
                ->where('status', true)
                ->first();

            abort_unless(
                $student,
                404,
                'No active student profile is linked to this account.'
            );

            $query->where('student_id', $student->id)
                ->where('status', 'published');
        }

        /*
         * PARENT ACCESS
         * Parents can download only published results belonging
         * to students linked to their parent profile.
         */
        elseif ($user->hasRole('Parent')) {
            $parent = $user->parent;

            abort_unless(
                $parent && $parent->school_id == $user->school_id,
                404,
                'Parent profile not found.'
            );

            $studentIds = $parent->students()
                ->where('students.school_id', $user->school_id)
                ->select('students.id');

            $query->whereIn('student_id', $studentIds)
                ->where('status', 'published');
        }

        /*
         * STAFF ACCESS
         * Staff must have results.view permission and can only
         * access results belonging to their school.
         */
        else {
            abort_unless(
                $user->can('results.view'),
                403,
                'You are not authorized to view results.'
            );

            $query->whereHas('student', function ($studentQuery) use ($user) {
                $studentQuery->where('school_id', $user->school_id);
            });
        }

        $result = $query->with([
            'student.school',
            'schoolClass',
            'academicSession',
            'term',
            'details.subject',
        ])->findOrFail($resultId);

        abort_unless(
            $result->status === 'published',
            403,
            'Only published results can be downloaded as report cards.'
        );

        $student = $result->student;
        $school = $student->school;

        $components = AssessmentComponent::where(
            'school_id',
            $student->school_id
        )
            ->where('is_active', true)
            ->orderBy('display_order')
            ->get();

        $scores = Score::with('assessmentComponent')
            ->where('student_id', $result->student_id)
            ->where('class_id', $result->class_id)
            ->where('academic_session_id', $result->academic_session_id)
            ->where('term_id', $result->term_id)
            ->get()
            ->groupBy('subject_id');

        $subjects = $result->details->map(function ($detail) use ($scores) {
            $subjectScores = ($scores->get($detail->subject_id) ?? collect())
                ->filter(fn ($score) => $score->assessmentComponent !== null)
                ->keyBy(fn ($score) => strtoupper(
                    $score->assessmentComponent->code
                ));

            return [
                'name' => $detail->subject?->name ?? 'Unknown Subject',
                'scores' => $subjectScores,
                'total' => $detail->total_score,
                'grade' => $detail->grade,
                'remark' => $detail->remark,
                'position' => $detail->subject_position,
            ];
        });

        $class = $result->schoolClass;

        $className = trim(
            ($class->name ?? '') . ' ' . ($class->section ?? '')
        );

        $pdf = Pdf::loadView('reports.report-card', [
            'school' => $school,
            'student' => $student,
            'result' => $result,
            'components' => $components,
            'subjects' => $subjects,
            'className' => $className,
        ])->setPaper('a4', 'portrait');

        $filename = 'report-card-' .
            preg_replace(
                '/[^A-Za-z0-9_-]/',
                '-',
                $student->admission_number
            ) .
            '.pdf';

        return $pdf->stream($filename);
    }
}
