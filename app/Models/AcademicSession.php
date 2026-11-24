<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicSession extends Model
{
    use HasFactory;

    protected $table = 'academic_sessions';

    protected $fillable = [
        'school_id',
        'name',
        'start_date',
        'end_date',
        'is_current',
        'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_current' => 'boolean',
        'status' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function school()
    {
        return $this->belongsTo(
            School::class,
            'school_id'
        );
    }

    public function terms()
    {
        return $this->hasMany(
            Term::class,
            'academic_session_id'
        );
    }

    public function teacherAssignments()
    {
        return $this->hasMany(
            TeacherSubject::class,
            'academic_session_id'
        );
    }

    public function studentEnrollments()
    {
        return $this->hasMany(
            StudentClass::class,
            'academic_session_id'
        );
    }

    public function scores()
    {
        return $this->hasMany(
            Score::class,
            'academic_session_id'
        );
    }

    public function results()
    {
        return $this->hasMany(
            Result::class,
            'academic_session_id'
        );
    }
}