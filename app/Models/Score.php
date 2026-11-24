<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Score extends Model
{
    use HasFactory;

    protected $table = 'scores';

    protected $fillable = [
        'student_id',
        'subject_id',
        'class_id',
        'academic_session_id',
        'term_id',
        'assessment_component_id',
        'score',
        'entered_by',
        'status',
    ];

    protected $casts = [
        'score' => 'decimal:2',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
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
            AcademicSession::class
        );
    }

    public function term()
    {
        return $this->belongsTo(Term::class);
    }

    public function assessmentComponent()
    {
        return $this->belongsTo(
            AssessmentComponent::class
        );
    }

    public function enteredBy()
    {
        return $this->belongsTo(
            User::class,
            'entered_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function getMaximumScoreAttribute(): float
    {
        return (float) (
            $this->assessmentComponent?->maximum_score ?? 0
        );
    }

    public function getPercentageAttribute(): float
    {
        $maximum = $this->maximum_score;

        if ($maximum <= 0) {
            return 0;
        }

        return round(
            ((float) $this->score / $maximum) * 100,
            2
        );
    }
}