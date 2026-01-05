<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndUsersSeeder::class,
            SettingsSeeder::class,
            BarangaysSeeder::class,
            LgusSeeder::class,
            LguYearStatsSeeder::class,
            Module1MasterDataSeeder::class,
            FormsModuleSeeder::class,
        ]);
    }
}
