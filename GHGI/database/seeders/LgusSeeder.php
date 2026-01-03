<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Lgu;

class LgusSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'LAGUNA_DEMO', 'name' => 'Laguna (Demo)', 'is_active' => true],
        ];

        foreach ($rows as $r) {
            Lgu::updateOrCreate(['code' => $r['code']], $r);
        }
    }
}
