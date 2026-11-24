<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'school_id',
        'department_id',
        'name',
        'level',
        'section',
        'class_teacher_id',
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
        return $this->belongsTo(School::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function classTeacher()
    {
        return $this->belongsTo(
            Teacher::class,
            'class_teacher_id'
        );
    }

    public function subjects()
    {
        return $this->belongsToMany(
            Subject::class,
            'class_subjects',
            'class_id',
            'subject_id'
        )
        ->withPivot('academic_session_id')
        ->withTimestamps();
    }

    public function teacherAssignments()
    {
        return $this->hasMany(
            TeacherSubject::class,
            'class_id'
        );
    }
}