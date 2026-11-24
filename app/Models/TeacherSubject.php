<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherSubject extends Model
{
    use HasFactory;

    protected $table = 'teacher_subjects';

    protected $fillable = [
        'teacher_id',
        'class_id',
        'subject_id',
        'academic_session_id',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(
            SchoolClass::class,
            'class_id'
        );
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function academicSession()
    {
        return $this->belongsTo(
            AcademicSession::class
        );
    }
}