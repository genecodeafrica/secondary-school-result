<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Term extends Model
{
    use HasFactory;

    protected $table = 'terms';

    protected $fillable = [
        'academic_session_id',
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

    public function academicSession()
    {
        return $this->belongsTo(
            AcademicSession::class,
            'academic_session_id'
        );
    }

    public function studentEnrollments()
    {
        return $this->hasMany(
            StudentClass::class,
            'term_id'
        );
    }

    public function scores()
    {
        return $this->hasMany(
            Score::class,
            'term_id'
        );
    }

    public function results()
    {
        return $this->hasMany(
            Result::class,
            'term_id'
        );
    }
}