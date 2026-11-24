<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResultDetail extends Model
{
    use HasFactory;

    protected $table = 'result_details';

    protected $fillable = [
        'result_id',
        'student_id',
        'subject_id',
        'total_score',
        'grade',
        'remark',
        'subject_position',
    ];

    protected $casts = [
        'total_score' => 'decimal:2',
        'subject_position' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function result()
    {
        return $this->belongsTo(
            Result::class
        );
    }

    public function student()
    {
        return $this->belongsTo(
            Student::class
        );
    }

    public function subject()
    {
        return $this->belongsTo(
            Subject::class
        );
    }
}