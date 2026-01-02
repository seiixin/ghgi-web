\
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lgu extends Model
{
    protected $fillable = [
        'code',
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function barangays(): HasMany
    {
        return $this->hasMany(Barangay::class);
    }

    public function yearStats(): HasMany
    {
        return $this->hasMany(LguYearStat::class);
    }
}
