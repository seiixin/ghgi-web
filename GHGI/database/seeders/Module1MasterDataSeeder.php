<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class Module1MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            LgusSeeder::class,
            BarangaysSeeder::class,
            LguYearStatsSeeder::class,
        ]);
    }
}
