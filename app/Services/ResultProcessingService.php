<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\AssessmentComponent;
use App\Models\Grade;
use App\Models\Result;
use App\Models\ResultDetail;
use App\Models\Score;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\Term;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ResultProcessingService
{
    /**
     * Generate or update a student's result.
     */
    public function processStudentResult(
        Student $student,
        int $classId,
        int $academicSessionId,
        int $termId
    ): Result {
        return DB::transaction(function () use (
            $student,
            $classId,
            $academicSessionId,
            $termId
        ) {
            /*
            |--------------------------------------------------------------------------
            | 1. Validate student and academic ownership
            |--------------------------------------------------------------------------
            */

            if (!$student->status) {
                throw new RuntimeException(
                    'The selected student is inactive.'
                );
            }

            $schoolClass = $this->validateAcademicScope(
                $classId,
                $academicSessionId,
                $termId
            );

            if ((int) $student->school_id !== (int) $schoolClass->school_id) {
                throw new RuntimeException(
                    'The selected student and class do not belong to the same school.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | 2. Verify student enrollment
            |--------------------------------------------------------------------------
            */

            $enrollment = StudentClass::query()
                ->where('student_id', $student->id)
                ->where('class_id', $classId)
                ->where('academic_session_id', $academicSessionId)
                ->where('term_id', $termId)
                ->where('status', true)
                ->first();

            if (!$enrollment) {
                throw new RuntimeException(
                    'The student is not enrolled in the selected class, academic session and term.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | 3. Protect existing result workflow
            |--------------------------------------------------------------------------
            */

            $existingResult = Result::query()
                ->where('student_id', $student->id)
                ->where('class_id', $classId)
                ->where('academic_session_id', $academicSessionId)
                ->where('term_id', $termId)
                ->lockForUpdate()
                ->first();

            if ($existingResult && $existingResult->status !== 'draft') {
                throw new RuntimeException(
                    "This result is currently '{$existingResult->status}' and cannot be recalculated. Only draft results can be processed again."
                );
            }

            /*
            |--------------------------------------------------------------------------
            | 4. Load assessment components
            |--------------------------------------------------------------------------
            */

            $components = AssessmentComponent::query()
                ->where('school_id', $student->school_id)
                ->where('is_active', true)
                ->orderBy('display_order')
                ->get();

            if ($components->isEmpty()) {
                throw new RuntimeException(
                    'No active assessment components have been configured.'
                );
            }

            $componentMaximumTotal = $components->sum(
                fn ($component) => (float) $component->maximum_score
            );

            if ($componentMaximumTotal <= 0) {
                throw new RuntimeException(
                    'The assessment component configuration is invalid.'
                );
            }

            $componentsById = $components->keyBy('id');

            /*
            |--------------------------------------------------------------------------
            | 5. Load grade configuration
            |--------------------------------------------------------------------------
            */

            $grades = Grade::query()
                ->where('school_id', $student->school_id)
                ->where('is_active', true)
                ->orderByDesc('minimum_score')
                ->get();

            if ($grades->isEmpty()) {
                throw new RuntimeException(
                    'No active grade configuration has been found.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | 6. Load and validate student's scores
            |--------------------------------------------------------------------------
            */

            $scores = Score::query()
                ->with([
                    'assessmentComponent',
                    'subject',
                ])
                ->where('student_id', $student->id)
                ->where('class_id', $classId)
                ->where('academic_session_id', $academicSessionId)
                ->where('term_id', $termId)
                ->get();

            if ($scores->isEmpty()) {
                throw new RuntimeException(
                    'No assessment scores have been entered for this student.'
                );
            }

            $subjectIds = [];

            foreach ($scores as $scoreRecord) {
                $subject = $scoreRecord->subject;
                $component = $scoreRecord->assessmentComponent;

                if (!$subject || !$component) {
                    throw new RuntimeException(
                        'A saved score has an invalid subject or assessment component.'
                    );
                }

                if (
                    (int) $subject->school_id !== (int) $student->school_id
                    || !$subject->status
                ) {
                    throw new RuntimeException(
                        'A saved score references an invalid or inactive subject.'
                    );
                }

                if (
                    (int) $component->school_id !== (int) $student->school_id
                    || !$component->is_active
                    || !$componentsById->has($component->id)
                ) {
                    throw new RuntimeException(
                        'A saved score references an invalid or inactive assessment component.'
                    );
                }

                $scoreValue = (float) $scoreRecord->score;
                $maximumScore = (float) $component->maximum_score;

                if ($scoreValue < 0 || $scoreValue > $maximumScore) {
                    throw new RuntimeException(
                        'A saved score is outside its assessment component maximum.'
                    );
                }

                $subjectIds[] = (int) $subject->id;
            }

            /*
            |--------------------------------------------------------------------------
            | 7. Verify subjects belong to the selected class and session
            |--------------------------------------------------------------------------
            */

            $subjectIds = array_values(array_unique($subjectIds));

            $assignedSubjectIds = $schoolClass->subjects()
                ->whereIn('subjects.id', $subjectIds)
                ->wherePivot('academic_session_id', $academicSessionId)
                ->pluck('subjects.id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $unassignedSubjectIds = array_diff(
                $subjectIds,
                $assignedSubjectIds
            );

            if (!empty($unassignedSubjectIds)) {
                throw new RuntimeException(
                    'One or more scored subjects are not assigned to the selected class for this academic session.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | 8. Group scores by subject and require complete components
            |--------------------------------------------------------------------------
            */

            $scoresBySubject = $scores->groupBy('subject_id');

            $activeComponentIds = $components
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values()
                ->all();

            $subjectResults = [];

            foreach ($scoresBySubject as $subjectId => $subjectScores) {
                $subject = $subjectScores->first()->subject;

                if (!$subject) {
                    throw new RuntimeException(
                        'A scored subject could not be loaded.'
                    );
                }

                $recordedComponentIds = $subjectScores
                    ->pluck('assessment_component_id')
                    ->map(fn ($id) => (int) $id)
                    ->sort()
                    ->values()
                    ->all();

                if ($recordedComponentIds !== $activeComponentIds) {
                    $missingComponentIds = array_diff(
                        $activeComponentIds,
                        $recordedComponentIds
                    );

                    $missingComponents = $components
                        ->whereIn('id', $missingComponentIds)
                        ->pluck('code')
                        ->implode(', ');

                    throw new RuntimeException(
                        "Subject {$subject->name} does not have scores for all active assessment components."
                        . ($missingComponents
                            ? " Missing: {$missingComponents}."
                            : '')
                    );
                }

                $subjectTotal = 0;

                foreach ($components as $component) {
                    $scoreRecord = $subjectScores->firstWhere(
                        'assessment_component_id',
                        $component->id
                    );

                    if (!$scoreRecord) {
                        throw new RuntimeException(
                            "Subject {$subject->name} is missing assessment component {$component->code}."
                        );
                    }

                    $subjectTotal += (float) $scoreRecord->score;
                }

                $subjectTotal = round($subjectTotal, 2);

                /*
                |--------------------------------------------------------------------------
                | 9. Find subject grade
                |--------------------------------------------------------------------------
                */

                $grade = $this->findGrade(
                    $grades,
                    $subjectTotal
                );

                $subjectResults[] = [
                    'subject_id' => (int) $subjectId,
                    'subject_name' => $subject->name,
                    'total_score' => $subjectTotal,
                    'grade' => $grade->code,
                    'remark' => $grade->remark,
                ];
            }

            /*
            |--------------------------------------------------------------------------
            | 10. Confirm that subjects were calculated
            |--------------------------------------------------------------------------
            */

            if (empty($subjectResults)) {
                throw new RuntimeException(
                    'No valid subject results could be calculated.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | 11. Calculate grand total and average
            |--------------------------------------------------------------------------
            */

            $grandTotal = round(
                collect($subjectResults)->sum('total_score'),
                2
            );

            $subjectCount = count($subjectResults);

            $average = round($grandTotal / $subjectCount, 2);

            /*
            |--------------------------------------------------------------------------
            | 12. Determine overall grade
            |--------------------------------------------------------------------------
            */

            $overallGrade = $this->findGrade(
                $grades,
                $average
            );

            /*
            |--------------------------------------------------------------------------
            | 13. Create or update result
            |--------------------------------------------------------------------------
            */

            $result = Result::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'class_id' => $classId,
                    'academic_session_id' => $academicSessionId,
                    'term_id' => $termId,
                ],
                [
                    'total_score' => $grandTotal,
                    'average' => $average,
                    'overall_grade' => $overallGrade->code,
                    'overall_remark' => $overallGrade->remark,
                    'status' => 'draft',
                    'approved_by' => null,
                    'approved_at' => null,
                    'published_at' => null,
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | 14. Replace old subject details
            |--------------------------------------------------------------------------
            */

            ResultDetail::query()
                ->where('result_id', $result->id)
                ->delete();

            foreach ($subjectResults as $subjectResult) {
                ResultDetail::create([
                    'result_id' => $result->id,
                    'student_id' => $student->id,
                    'subject_id' => $subjectResult['subject_id'],
                    'total_score' => $subjectResult['total_score'],
                    'grade' => $subjectResult['grade'],
                    'remark' => $subjectResult['remark'],
                    'subject_position' => null,
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | 15. Calculate positions
            |--------------------------------------------------------------------------
            */

            $this->calculatePositions(
                $classId,
                $academicSessionId,
                $termId
            );

            /*
            |--------------------------------------------------------------------------
            | 16. Reload complete result
            |--------------------------------------------------------------------------
            */

            return $result->fresh([
                'student',
                'schoolClass',
                'academicSession',
                'term',
                'details.subject',
            ]);
        });
    }

    /**
     * Validate class, academic session and term ownership.
     */
    protected function validateAcademicScope(
        int $classId,
        int $academicSessionId,
        int $termId
    ): SchoolClass {
        $schoolClass = SchoolClass::find($classId);

        if (!$schoolClass) {
            throw new RuntimeException(
                'The selected class does not exist.'
            );
        }

        if (!$schoolClass->status) {
            throw new RuntimeException(
                'The selected class is inactive.'
            );
        }

        $academicSession = AcademicSession::find($academicSessionId);

        if (!$academicSession) {
            throw new RuntimeException(
                'The selected academic session does not exist.'
            );
        }

        if (
            (int) $academicSession->school_id
            !== (int) $schoolClass->school_id
        ) {
            throw new RuntimeException(
                'The selected class and academic session do not belong to the same school.'
            );
        }

        if (!$academicSession->status) {
            throw new RuntimeException(
                'The selected academic session is inactive.'
            );
        }

        $term = Term::find($termId);

        if (!$term) {
            throw new RuntimeException(
                'The selected term does not exist.'
            );
        }

        if ((int) $term->academic_session_id !== (int) $academicSession->id) {
            throw new RuntimeException(
                'The selected term does not belong to the selected academic session.'
            );
        }

        if (!$term->status) {
            throw new RuntimeException(
                'The selected term is inactive.'
            );
        }

        return $schoolClass;
    }

    /**
     * Calculate subject and overall class positions.
     * Published positions are permanently preserved.
     */
    public function calculatePositions(
        int $classId,
        int $academicSessionId,
        int $termId
    ): void {
        $this->validateAcademicScope(
            $classId,
            $academicSessionId,
            $termId
        );

        /*
        |--------------------------------------------------------------------------
        | 1. Load all results, including published results for ranking
        |--------------------------------------------------------------------------
        */

        $results = Result::query()
            ->where('class_id', $classId)
            ->where('academic_session_id', $academicSessionId)
            ->where('term_id', $termId)
            ->whereIn('status', [
                'draft',
                'submitted',
                'under_review',
                'approved',
                'published',
            ])
            ->orderByDesc('average')
            ->orderBy('student_id')
            ->get();

        if ($results->isEmpty()) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 2. Calculate overall positions
        |--------------------------------------------------------------------------
        */

        $position = 0;
        $previousAverage = null;
        $rank = 0;

        foreach ($results as $result) {
            $rank++;

            $currentAverage = (float) $result->average;

            if (
                $previousAverage === null
                || $currentAverage < $previousAverage
            ) {
                $position = $rank;
            }

            // Never modify a published result.
            if ($result->status !== 'published') {
                $result->update([
                    'position' => $position,
                ]);
            }

            $previousAverage = $currentAverage;
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Load result details and their result statuses
        |--------------------------------------------------------------------------
        */

        $details = ResultDetail::query()
            ->with('result:id,status')
            ->whereIn('result_id', $results->pluck('id'))
            ->get()
            ->groupBy('subject_id');

        /*
        |--------------------------------------------------------------------------
        | 4. Calculate subject positions
        |--------------------------------------------------------------------------
        */

        foreach ($details as $subjectDetails) {
            $sortedDetails = $subjectDetails
                ->sortByDesc(
                    fn ($detail) => (float) $detail->total_score
                )
                ->values();

            $position = 0;
            $rank = 0;
            $previousScore = null;

            foreach ($sortedDetails as $detail) {
                $rank++;

                $currentScore = (float) $detail->total_score;

                if (
                    $previousScore === null
                    || $currentScore < $previousScore
                ) {
                    $position = $rank;
                }

                // Preserve subject positions for published results.
                if ($detail->result?->status !== 'published') {
                    $detail->update([
                        'subject_position' => $position,
                    ]);
                }

                $previousScore = $currentScore;
            }
        }
    }

    /**
     * Find the grade matching a score.
     */
    protected function findGrade($grades, float $score): Grade
    {
        $grade = $grades->first(function ($grade) use ($score) {
            return $score >= (float) $grade->minimum_score
                && (
                    $grade->maximum_score === null
                    || $score <= (float) $grade->maximum_score
                );
        });

        if (!$grade) {
            throw new RuntimeException(
                "No active grade configuration matches the score {$score}."
            );
        }

        return $grade;
    }
}
