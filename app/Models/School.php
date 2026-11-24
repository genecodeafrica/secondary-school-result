<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class School extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'address',
        'phone',
        'email',
        'logo',
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

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function students()
    {
        return $this->hasMany(Student::class);
    }

    public function parents()
    {
        return $this->hasMany(ParentModel::class);
    }

    public function teachers()
    {
        return $this->hasMany(Teacher::class);
    }

    public function academicSessions()
    {
        return $this->hasMany(AcademicSession::class);
    }

    public function departments()
    {
        return $this->hasMany(Department::class);
    }

    public function classes()
    {
        return $this->hasMany(SchoolClass::class);
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    public function assessmentComponents()
    {
        return $this->hasMany(AssessmentComponent::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }
}