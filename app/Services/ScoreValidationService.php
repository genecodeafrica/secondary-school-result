<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\AssessmentComponent;
use App\Models\Score;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherSubject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ScoreValidationService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {
    }

    /**
     * Validate and save a student's score.
     */
    public function saveScore(
        User $user,
        int $studentId,
        int $subjectId,
        int $classId,
        int $academicSessionId,
        int $termId,
        int $assessmentComponentId,
        float $score
    ): Score {
        $this->ensurePermission($user, 'results.enter');

        $this->validateScoreEntry(
            $user,
            $studentId,
            $subjectId,
            $classId,
            $academicSessionId,
            $termId,
            $assessmentComponentId,
            $score
        );

        return DB::transaction(function () use (
            $user,
            $studentId,
            $subjectId,
            $classId,
            $academicSessionId,
            $termId,
            $assessmentComponentId,
            $score
        ) {
            $existingScore = Score::where([
                'student_id' => $studentId,
                'subject_id' => $subjectId,
                'class_id' => $classId,
                'academic_session_id' => $academicSessionId,
                'term_id' => $termId,
                'assessment_component_id' => $assessmentComponentId,
            ])->first();

            $oldValues = $existingScore
                ? $this->scoreAuditValues($existingScore)
                : null;

            $savedScore = Score::updateOrCreate(
                [
                    'student_id' => $studentId,
                    'subject_id' => $subjectId,
                    'class_id' => $classId,
                    'academic_session_id' => $academicSessionId,
                    'term_id' => $termId,
                    'assessment_component_id' => $assessmentComponentId,
                ],
                [
                    'score' => $score,
                    'entered_by' => $user->id,
                    'status' => 'draft',
                ]
            );

            $savedScore->load([
                'student',
                'subject',
                'schoolClass',
                'academicSession',
                'term',
                'assessmentComponent',
            ]);

            $action = $existingScore
                ? 'score.updated'
                : 'score.created';

            $this->auditLogService->log(
                $user,
                $action,
                'scores',
                $savedScore,
                $oldValues,
                $this->scoreAuditValues($savedScore)
            );

            return $savedScore;
        });
    }

    /**
     * Validate whether the user is allowed to enter this score.
     */
    public function validateScoreEntry(
        User $user,
        int $studentId,
        int $subjectId,
        int $classId,
        int $academicSessionId,
        int $termId,
        int $assessmentComponentId,
        float $score
    ): void {
        if (!$user->school_id) {
            throw new AuthorizationException(
                'Your account is not associated with a school.'
            );
        }

        // Validate academic session ownership and status.
        $academicSession = AcademicSession::find($academicSessionId);

        if (!$academicSession) {
            throw new RuntimeException(
                'The selected academic session does not exist.'
            );
        }

        if ((int) $academicSession->school_id !== (int) $user->school_id) {
            throw new AuthorizationException(
                'You cannot enter scores for another school\'s academic session.'
            );
        }

        if (!$academicSession->status) {
            throw new RuntimeException(
                'The selected academic session is inactive.'
            );
        }

        // Validate term belongs to the selected academic session.
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

        // Validate student.
        $student = Student::find($studentId);

        if (!$student) {
            throw new RuntimeException(
                'The selected student does not exist.'
            );
        }

        if ((int) $student->school_id !== (int) $user->school_id) {
            throw new AuthorizationException(
                'You cannot enter scores for a student from another school.'
            );
        }

        if (!$student->status) {
            throw new RuntimeException(
                'The selected student is inactive.'
            );
        }

        // Validate class.
        $schoolClass = SchoolClass::find($classId);

        if (!$schoolClass) {
            throw new RuntimeException(
                'The selected class does not exist.'
            );
        }

        if ((int) $schoolClass->school_id !== (int) $user->school_id) {
            throw new AuthorizationException(
                'You cannot enter scores for a class from another school.'
            );
        }

        if (!$schoolClass->status) {
            throw new RuntimeException(
                'The selected class is inactive.'
            );
        }

        // Validate subject.
        $subject = Subject::find($subjectId);

        if (!$subject) {
            throw new RuntimeException(
                'The selected subject does not exist.'
            );
        }

        if ((int) $subject->school_id !== (int) $user->school_id) {
            throw new AuthorizationException(
                'You cannot enter scores for a subject from another school.'
            );
        }

        if (!$subject->status) {
            throw new RuntimeException(
                'The selected subject is inactive.'
            );
        }

        // Validate teacher assignment or administrator role.
        $isSchoolAdministrator = $user->hasAnyRole([
            'Super Admin',
            'School Admin',
        ]);

        if (!$isSchoolAdministrator) {
            $teacher = Teacher::where('user_id', $user->id)
                ->where('school_id', $user->school_id)
                ->where('status', true)
                ->first();

            if (!$teacher) {
                throw new AuthorizationException(
                    'Your account is not linked to an active teacher profile.'
                );
            }

            $assignmentExists = TeacherSubject::where([
                'teacher_id' => $teacher->id,
                'class_id' => $classId,
                'subject_id' => $subjectId,
                'academic_session_id' => $academicSessionId,
            ])->exists();

            if (!$assignmentExists) {
                throw new AuthorizationException(
                    'You are not assigned to teach this subject for the selected class and academic session.'
                );
            }
        }

        // Validate assessment component.
        $component = AssessmentComponent::find($assessmentComponentId);

        if (!$component) {
            throw new RuntimeException(
                'The selected assessment component does not exist.'
            );
        }

        if ((int) $component->school_id !== (int) $user->school_id) {
            throw new AuthorizationException(
                'You cannot use an assessment component from another school.'
            );
        }

        if (!$component->is_active) {
            throw new RuntimeException(
                'The selected assessment component is inactive.'
            );
        }

        // Validate score range.
        $maximumScore = (float) $component->maximum_score;

        if ($score < 0) {
            throw new RuntimeException(
                'Score cannot be less than zero.'
            );
        }

        if ($score > $maximumScore) {
            throw new RuntimeException(
                "Score cannot be greater than {$maximumScore}."
            );
        }

        // Validate student enrollment for the exact session and term.
        $enrollmentExists = StudentClass::where([
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_session_id' => $academicSessionId,
            'term_id' => $termId,
            'status' => true,
        ])->exists();

        if (!$enrollmentExists) {
            throw new RuntimeException(
                'The student is not enrolled in the selected class, academic session and term.'
            );
        }

        // Validate subject is assigned to this class for this session.
        $subjectAssignedToClass = $schoolClass
            ->subjects()
            ->where('subjects.id', $subjectId)
            ->wherePivot('academic_session_id', $academicSessionId)
            ->exists();

        if (!$subjectAssignedToClass) {
            throw new RuntimeException(
                'The selected subject is not assigned to the selected class for this academic session.'
            );
        }
    }

    /**
     * Check the user's permission.
     */
    protected function ensurePermission(
        User $user,
        string $permission
    ): void {
        if (!$user->can($permission)) {
            throw new AuthorizationException(
                "You do not have permission to perform this action. Required permission: {$permission}."
            );
        }
    }

    /**
     * Values stored in the audit log.
     */
    protected function scoreAuditValues(Score $score): array
    {
        return [
            'score_id' => $score->id,
            'student_id' => $score->student_id,
            'subject_id' => $score->subject_id,
            'class_id' => $score->class_id,
            'academic_session_id' => $score->academic_session_id,
            'term_id' => $score->term_id,
            'assessment_component_id' => $score->assessment_component_id,
            'score' => (float) $score->score,
            'maximum_score' => $score->maximum_score,
            'percentage' => $score->percentage,
            'status' => $score->status,
        ];
    }
}
