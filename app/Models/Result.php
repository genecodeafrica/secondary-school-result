<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Result extends Model
{
    use HasFactory;

    protected $table = 'results';

    protected $fillable = [
        'student_id',
        'class_id',
        'academic_session_id',
        'term_id',
        'total_score',
        'average',
        'position',
        'overall_grade',
        'overall_remark',
        'status',
        'approved_by',
        'approved_at',
        'published_at',
    ];

    protected $casts = [
        'total_score' => 'decimal:2',
        'average' => 'decimal:2',
        'position' => 'integer',
        'approved_at' => 'datetime',
        'published_at' => 'datetime',
    ];


    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function student()
    {
        return $this->belongsTo(
            Student::class,
            'student_id'
        );
    }

    public function schoolClass()
    {
        return $this->belongsTo(
            SchoolClass::class,
            'class_id'
        );
    }

    public function academicSession()
    {
        return $this->belongsTo(
            AcademicSession::class,
            'academic_session_id'
        );
    }

    public function term()
    {
        return $this->belongsTo(
            Term::class,
            'term_id'
        );
    }

    public function details()
    {
        return $this->hasMany(
            ResultDetail::class,
            'result_id'
        );
    }

    public function approvedBy()
    {
        return $this->belongsTo(
            User::class,
            'approved_by'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Workflow State Checks
    |--------------------------------------------------------------------------
    */

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }

    public function isUnderReview(): bool
    {
        return $this->status === 'under_review';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }


    /*
    |--------------------------------------------------------------------------
    | Workflow Permissions
    |--------------------------------------------------------------------------
    */

    public function canSubmit(): bool
    {
        return $this->isDraft();
    }

    public function canReview(): bool
    {
        return $this->isSubmitted();
    }

    public function canApprove(): bool
    {
        return $this->isUnderReview();
    }

    public function canPublish(): bool
    {
        return $this->isApproved();
    }


    /*
    |--------------------------------------------------------------------------
    | Display Helpers
    |--------------------------------------------------------------------------
    */

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'Draft',
            'submitted' => 'Submitted',
            'under_review' => 'Under Review',
            'approved' => 'Approved',
            'published' => 'Published',
            default => ucfirst(
                str_replace('_', ' ', $this->status ?? '')
            ),
        };
    }
}