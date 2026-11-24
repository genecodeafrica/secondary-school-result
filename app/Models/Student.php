<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'user_id',
        'admission_number',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'date_of_birth',
        'photo',
        'phone',
        'email',
        'address',
        'status',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function enrollments()
    {
        return $this->hasMany(StudentClass::class);
    }

    public function parents()
    {
        return $this->belongsToMany(
            ParentModel::class,
            'parent_students',
            'student_id',
            'parent_id'
        )->withTimestamps();
    }

    public function scores()
    {
        return $this->hasMany(Score::class);
    }

    public function results()
    {
        return $this->hasMany(Result::class);
    }

    public function resultDetails()
    {
        return $this->hasMany(ResultDetail::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    public function getFullNameAttribute(): string
    {
        return trim(
            $this->first_name . ' ' .
            ($this->middle_name
                ? $this->middle_name . ' '
                : '') .
            $this->last_name
        );
    }
}
