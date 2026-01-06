<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormMapping extends Model
{
    protected $table = 'form_mappings';

    protected $fillable = [
        'form_type_id',
        'year',
        'mapping_json',
    ];

    protected $casts = [
        'mapping_json' => 'array',
        'year' => 'integer',
    ];
}
