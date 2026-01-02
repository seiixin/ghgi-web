\
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LguYearStat extends Model
{
    protected $table = 'lgu_year_stats';

    protected $fillable = [
        'lgu_id',
        'year',
        'population',
        'area_km2',
    ];

    protected $casts = [
        'year' => 'integer',
        'population' => 'integer',
        'area_km2' => 'decimal:3',
    ];

    public function lgu(): BelongsTo
    {
        return $this->belongsTo(Lgu::class);
    }
}
