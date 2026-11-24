<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssessmentComponent extends Model
{
    use HasFactory;

    protected $table = 'assessment_components';

    protected $fillable = [
        'school_id',
        'name',
        'code',
        'maximum_score',
        'weight',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'maximum_score' => 'decimal:2',
        'weight' => 'decimal:2',
        'display_order' => 'integer',
        'is_active' => 'boolean',
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

    public function scores()
    {
        return $this->hasMany(Score::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function getPercentageAttribute(): float
    {
        return (float) $this->weight;
    }
}