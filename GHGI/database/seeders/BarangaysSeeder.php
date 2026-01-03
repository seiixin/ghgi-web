<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Lgu;

class BarangaysSeeder extends Seeder
{
    public function run(): void
    {
        $lgu = Lgu::where('code', 'LAGUNA_DEMO')->first();
        if (!$lgu) {
            return;
        }

        $barangays = [
            'Barangay Uno',
            'Barangay Dos',
            'Barangay Tres',
            'Barangay Apat',
            'Barangay Lima',
            'Barangay Anim',
            'Barangay Pito',
            'Barangay Walo',
            'Barangay Siyam',
            'Barangay Sampu',
        ];

        foreach ($barangays as $name) {
            $lgu->barangays()->updateOrCreate(
                ['name' => $name],
                ['is_active' => true]
            );
        }
    }
}
