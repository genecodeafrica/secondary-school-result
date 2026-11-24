<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentClass extends Model
{
    use HasFactory;

    protected $table = 'student_classes';

    protected $fillable = [
        'student_id',
        'class_id',
        'academic_session_id',
        'term_id',
        'is_current',
        'status',
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'status' => 'boolean',
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
}