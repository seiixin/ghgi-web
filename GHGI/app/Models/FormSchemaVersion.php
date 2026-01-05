<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormSchemaVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_type_id',
        'year',
        'version',
        'schema_json',
        'ui_json',
        'status',
    ];

    protected $casts = [
        'schema_json' => 'array',
        'ui_json' => 'array',
        'year' => 'integer',
        'version' => 'integer',
    ];

    public function formType(): BelongsTo
    {
        return $this->belongsTo(FormType::class);
    }
}
