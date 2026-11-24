<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'department_id',
        'code',
        'name',
        'category',
        'status',
    ];

    protected $casts = [
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
            School::class
        );
    }

    public function department()
    {
        return $this->belongsTo(
            Department::class
        );
    }

    public function classes()
    {
        return $this->belongsToMany(
            SchoolClass::class,
            'class_subjects',
            'subject_id',
            'class_id'
        )
        ->withPivot(
            'academic_session_id'
        )
        ->withTimestamps();
    }

    public function teacherAssignments()
    {
        return $this->hasMany(
            TeacherSubject::class
        );
    }

    public function scores()
    {
        return $this->hasMany(
            Score::class
        );
    }

    public function resultDetails()
    {
        return $this->hasMany(
            ResultDetail::class
        );
    }
}