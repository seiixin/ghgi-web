<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormMapping extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_type_id',
        'year',
        'mapping_json',
    ];

    protected $casts = [
        'mapping_json' => 'array',
        'year' => 'integer',
    ];

    public function formType(): BelongsTo
    {
        return $this->belongsTo(FormType::class);
    }
}
