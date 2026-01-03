<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Lgu;

class LguYearStatsSeeder extends Seeder
{
    public function run(): void
    {
        $lgu = Lgu::where('code', 'LAGUNA_DEMO')->first();
        if (!$lgu) {
            return;
        }

        $lgu->yearStats()->updateOrCreate(
            ['year' => 2023],
            [
                'population' => 1000000,
                'area_km2' => 1759.000,
            ]
        );

        $lgu->yearStats()->updateOrCreate(
            ['year' => 2026],
            [
                'population' => 1100000,
                'area_km2' => 1759.000,
            ]
        );
    }
}
