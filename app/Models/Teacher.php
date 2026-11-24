<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Teacher extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'user_id',
        'teacher_id',
        'first_name',
        'middle_name',
        'last_name',
        'phone',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function classes()
    {
        return $this->hasMany(
            SchoolClass::class,
            'class_teacher_id'
        );
    }

    public function assignments()
    {
        return $this->hasMany(
            TeacherSubject::class
        );
    }

    public function subjects()
    {
        return $this->belongsToMany(
            Subject::class,
            'teacher_subjects',
            'teacher_id',
            'subject_id'
        )
        ->withPivot([
            'class_id',
            'academic_session_id',
        ])
        ->withTimestamps();
    }
}