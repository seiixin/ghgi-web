<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormType extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'name',
        'sector_key',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function schemaVersions(): HasMany
    {
        return $this->hasMany(FormSchemaVersion::class);
    }

    public function mappings(): HasMany
    {
        return $this->hasMany(FormMapping::class);
    }
}
