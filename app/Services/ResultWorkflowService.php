<?php

namespace App\Services;

use App\Models\Result;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class ResultWorkflowService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {
    }

    /**
     * Submit a draft result for review.
     *
     * DRAFT -> SUBMITTED
     */
    public function submit(User $user, Result $result): Result
    {
        $this->ensureSameSchool($user, $result);
        $this->ensurePermission($user, 'results.submit');

        if (!$result->canSubmit()) {
            throw new RuntimeException(
                "This result cannot be submitted because its current status is '{$result->status}'."
            );
        }

        $oldValues = $this->workflowValues($result);

        return DB::transaction(function () use (
            $user,
            $result,
            $oldValues
        ) {
            $result->update([
                'status' => 'submitted',
            ]);

            $result->refresh();

            $this->auditLogService->log(
                $user,
                'result.submitted',
                'results',
                $result,
                $oldValues,
                $this->workflowValues($result)
            );

            return $result;
        });
    }

    /**
     * Start reviewing a submitted result.
     *
     * SUBMITTED -> UNDER_REVIEW
     */
    public function startReview(User $user, Result $result): Result
    {
        $this->ensureSameSchool($user, $result);
        $this->ensurePermission($user, 'results.review');

        if (!$result->canReview()) {
            throw new RuntimeException(
                "This result cannot enter review because its current status is '{$result->status}'."
            );
        }

        $oldValues = $this->workflowValues($result);

        return DB::transaction(function () use (
            $user,
            $result,
            $oldValues
        ) {
            $result->update([
                'status' => 'under_review',
            ]);

            $result->refresh();

            $this->auditLogService->log(
                $user,
                'result.review_started',
                'results',
                $result,
                $oldValues,
                $this->workflowValues($result)
            );

            return $result;
        });
    }

    /**
     * Approve a result.
     *
     * UNDER_REVIEW -> APPROVED
     */
    public function approve(User $user, Result $result): Result
    {
        $this->ensureSameSchool($user, $result);
        $this->ensurePermission($user, 'results.approve');

        if (!$result->canApprove()) {
            throw new RuntimeException(
                "This result cannot be approved because its current status is '{$result->status}'."
            );
        }

        $oldValues = $this->workflowValues($result);

        return DB::transaction(function () use (
            $user,
            $result,
            $oldValues
        ) {
            $result->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'published_at' => null,
            ]);

            $result->refresh();

            $this->auditLogService->log(
                $user,
                'result.approved',
                'results',
                $result,
                $oldValues,
                $this->workflowValues($result)
            );

            return $result;
        });
    }

    /**
     * Reject a result and return it to draft.
     *
     * UNDER_REVIEW -> DRAFT
     *
     * Note:
     * The current results table does not contain a rejection_reason
     * column, so the reason is recorded in the audit log.
     */
    public function reject(
        User $user,
        Result $result,
        ?string $reason = null
    ): Result {
        $this->ensureSameSchool($user, $result);
        $this->ensurePermission($user, 'results.reject');

        if (!$result->canApprove()) {
            throw new RuntimeException(
                "This result cannot be rejected because its current status is '{$result->status}'."
            );
        }

        $oldValues = $this->workflowValues($result);

        return DB::transaction(function () use (
            $user,
            $result,
            $reason,
            $oldValues
        ) {
            $result->update([
                'status' => 'draft',
                'approved_by' => null,
                'approved_at' => null,
                'published_at' => null,
            ]);

            $result->refresh();

            $newValues = $this->workflowValues($result);

            /*
             * Store the rejection reason in the audit log.
             * This avoids adding a database column at this stage.
             */
            if ($reason !== null && trim($reason) !== '') {
                $newValues['rejection_reason'] = trim($reason);
            }

            $this->auditLogService->log(
                $user,
                'result.rejected',
                'results',
                $result,
                $oldValues,
                $newValues
            );

            return $result;
        });
    }

    /**
     * Publish an approved result.
     *
     * APPROVED -> PUBLISHED
     */
    public function publish(User $user, Result $result): Result
    {
        $this->ensureSameSchool($user, $result);
        $this->ensurePermission($user, 'results.publish');

        if (!$result->canPublish()) {
            throw new RuntimeException(
                "This result cannot be published because its current status is '{$result->status}'."
            );
        }

        $oldValues = $this->workflowValues($result);

        return DB::transaction(function () use (
            $user,
            $result,
            $oldValues
        ) {
            $result->update([
                'status' => 'published',
                'published_at' => now(),
            ]);

            $result->refresh();

            $this->auditLogService->log(
                $user,
                'result.published',
                'results',
                $result,
                $oldValues,
                $this->workflowValues($result)
            );

            return $result;
        });
    }

    /**
     * Make sure the result belongs to the same school
     * as the currently authenticated user.
     */
    protected function ensureSameSchool(
        User $user,
        Result $result
    ): void {
        if (!$user->school_id) {
            throw new AuthorizationException(
                'Your account is not associated with a school.'
            );
        }

        /*
         * Use the student's school as the authoritative school
         * relationship for the result.
         */
        $studentSchoolId = $result->student?->school_id;

        if (!$studentSchoolId) {
            throw new ModelNotFoundException(
                'The student associated with this result could not be found.'
            );
        }

        if ((int) $studentSchoolId !== (int) $user->school_id) {
            throw new AuthorizationException(
                'You are not authorized to manage results from another school.'
            );
        }
    }

    /**
     * Check whether the user has the required Spatie permission.
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
     * Return only workflow-related fields for audit logging.
     */
    protected function workflowValues(Result $result): array
    {
        return [
            'status' => $result->status,
            'approved_by' => $result->approved_by,
            'approved_at' => $result->approved_at?->toISOString(),
            'published_at' => $result->published_at?->toISOString(),
        ];
    }
}