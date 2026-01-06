<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Submission extends Model
{
    protected $fillable = [
        'form_type_id',
        'schema_version_id',
        'mapping_id',
        'year',
        'source',
        'status',
        'created_by',
        'submitted_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'year' => 'integer',
    ];

    public function answers(): HasMany
    {
        return $this->hasMany(SubmissionAnswer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function formType()
    {
        return $this->belongsTo(\App\Models\FormType::class, 'form_type_id');
    }

}
