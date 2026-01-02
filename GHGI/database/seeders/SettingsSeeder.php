<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        Setting::put('app_name', 'GHGI-Laguna');
        Setting::put('default_year', 2023);

        Setting::put('map_center_lat', 14.17);
        Setting::put('map_center_lng', 121.24);
        Setting::put('map_zoom', 10);
    }
}
