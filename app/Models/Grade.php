<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    use HasFactory;

    protected $table = 'grades';

    protected $fillable = [
        'school_id',
        'name',
        'code',
        'minimum_score',
        'maximum_score',
        'remark',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'minimum_score' => 'decimal:2',
        'maximum_score' => 'decimal:2',
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

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function containsScore(float $score): bool
    {
        return $score >= (float) $this->minimum_score
            && $score <= (float) $this->maximum_score;
    }

    public function getRangeAttribute(): string
    {
        return number_format(
            (float) $this->minimum_score,
            2
        ) . ' - ' .
        number_format(
            (float) $this->maximum_score,
            2
        );
    }
}