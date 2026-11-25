<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\AssessmentComponent;
use App\Models\Grade;
use App\Models\Result;
use App\Models\ResultDetail;
use App\Models\Score;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\Term;
use Illuminate\Support\Collection;
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
            | 1. Verify student enrollment
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
            | Protect existing result workflow
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
            | 2. Load assessment components
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


            /*
            |--------------------------------------------------------------------------
            | 3. Validate assessment configuration
            |--------------------------------------------------------------------------
            */

            $componentMaximumTotal = $components->sum(
                fn ($component) => (float) $component->maximum_score
            );

            if ($componentMaximumTotal <= 0) {
                throw new RuntimeException(
                    'The assessment component configuration is invalid.'
                );
            }


            /*
            |--------------------------------------------------------------------------
            | 4. Load grade configuration
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
            | 5. Load student's scores
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


            /*
            |--------------------------------------------------------------------------
            | 6. Group scores by subject
            |--------------------------------------------------------------------------
            */

            $scoresBySubject = $scores->groupBy('subject_id');

            $subjectResults = [];

            foreach ($scoresBySubject as $subjectId => $subjectScores) {

                $subject = $subjectScores->first()->subject;

                if (!$subject) {
                    continue;
                }

                $subjectTotal = 0;

                foreach ($components as $component) {

                    $scoreRecord = $subjectScores->firstWhere(
                        'assessment_component_id',
                        $component->id
                    );

                    if (!$scoreRecord) {
                        continue;
                    }

                    $scoreValue = (float) $scoreRecord->score;

                    $maximumScore = (float) $component->maximum_score;

                    /*
                     * Protect against invalid values.
                     */
                    if ($scoreValue < 0) {
                        $scoreValue = 0;
                    }

                    if ($scoreValue > $maximumScore) {
                        $scoreValue = $maximumScore;
                    }

                    $subjectTotal += $scoreValue;
                }

                $subjectTotal = round($subjectTotal, 2);

                /*
                |--------------------------------------------------------------------------
                | Find subject grade
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
                    'grade' => $grade?->code,
                    'remark' => $grade?->remark,
                ];
            }


            /*
            |--------------------------------------------------------------------------
            | 7. Confirm that subjects were calculated
            |--------------------------------------------------------------------------
            */

            if (empty($subjectResults)) {
                throw new RuntimeException(
                    'No valid subject results could be calculated.'
                );
            }


            /*
            |--------------------------------------------------------------------------
            | 8. Calculate grand total
            |--------------------------------------------------------------------------
            */

            $grandTotal = collect($subjectResults)
                ->sum('total_score');

            $grandTotal = round($grandTotal, 2);


            /*
            |--------------------------------------------------------------------------
            | 9. Calculate average
            |--------------------------------------------------------------------------
            */

            $subjectCount = count($subjectResults);

            $average = $subjectCount > 0
                ? round($grandTotal / $subjectCount, 2)
                : 0;


            /*
            |--------------------------------------------------------------------------
            | 10. Determine overall grade
            |--------------------------------------------------------------------------
            */

            $overallGrade = $this->findGrade(
                $grades,
                $average
            );


            /*
            |--------------------------------------------------------------------------
            | 11. Create or update result
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
                    'overall_grade' => $overallGrade?->code,
                    'overall_remark' => $overallGrade?->remark,

                    /*
                     * Reprocessing a result returns it to draft.
                     */
                    'status' => 'draft',

                    /*
                     * Previous approval/publishing data
                     * must not remain after recalculation.
                     */
                    'approved_by' => null,
                    'approved_at' => null,
                    'published_at' => null,
                ]
            );


            /*
            |--------------------------------------------------------------------------
            | 12. Remove old subject details
            |--------------------------------------------------------------------------
            */

            ResultDetail::query()
                ->where('result_id', $result->id)
                ->delete();


            /*
            |--------------------------------------------------------------------------
            | 13. Create subject result details
            |--------------------------------------------------------------------------
            */

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
            | 14. Calculate positions
            |--------------------------------------------------------------------------
            */

            $this->calculatePositions(
                $classId,
                $academicSessionId,
                $termId
            );


            /*
            |--------------------------------------------------------------------------
            | 15. Reload complete result
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
     * Calculate subject positions and overall class positions.
     * Published positions are permanently preserved.
     */
    public function calculatePositions(
        int $classId,
        int $academicSessionId,
        int $termId
    ): void {
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
        | 3. Load all result details for ranking
        |--------------------------------------------------------------------------
        */

        $details = ResultDetail::query()
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
}