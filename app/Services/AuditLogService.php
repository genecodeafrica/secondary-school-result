<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AuditLogService
{
    /**
     * Record an audit event.
     */
    public function log(
        User $user,
        string $action,
        string $module,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): AuditLog {
        return AuditLog::create([
            'school_id' => $user->school_id,

            'user_id' => $user->id,

            'action' => $action,

            'module' => $module,

            'auditable_type' => $auditable
                ? $auditable->getMorphClass()
                : null,

            'auditable_id' => $auditable?->getKey(),

            'old_values' => $oldValues,

            'new_values' => $newValues,

            'ip_address' => request()->ip(),

            'user_agent' => request()->userAgent(),
        ]);
    }
}