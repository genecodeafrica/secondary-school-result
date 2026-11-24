<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParentModel extends Model
{
    use HasFactory;

    protected $table = 'parents';

    protected $fillable = [
        'school_id',
        'user_id',
        'first_name',
        'last_name',
        'phone',
        'email',
        'address',
        'relationship',
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

    public function students()
    {
        return $this->belongsToMany(
            Student::class,
            'parent_students',
            'parent_id',
            'student_id'
        )->withTimestamps();
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    public function getFullNameAttribute(): string
    {
        return trim(
            $this->first_name . ' ' . $this->last_name
        );
    }
}