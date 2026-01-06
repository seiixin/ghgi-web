<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubmissionAnswer extends Model
{
    protected $fillable = [
        'submission_id',
        'form_type_id',
        'year',
        'field_key',
        'value_text',
        'value_number',
        'value_bool',
        'value_json',
        'option_key',
        'option_label',
        'label',
        'type',
    ];

    protected $casts = [
        'value_number' => 'decimal:6',
        'value_bool' => 'boolean',
        'value_json' => 'array',
        'year' => 'integer',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class);
    }
}
