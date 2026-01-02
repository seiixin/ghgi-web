\
<?php

namespace App\Services;

use App\Models\Barangay;
use App\Models\Lgu;
use App\Models\LguYearStat;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MasterDataService
{
    public function createLgu(array $data): Lgu
    {
        $data['code'] = strtoupper(trim($data['code'] ?? ''));
        $data['name'] = trim($data['name'] ?? '');

        return Lgu::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'is_active' => array_key_exists('is_active', $data) ? (bool)$data['is_active'] : true,
        ]);
    }

    public function updateLgu(Lgu $lgu, array $data): Lgu
    {
        if (array_key_exists('code', $data)) {
            $data['code'] = strtoupper(trim((string)$data['code']));
        }
        if (array_key_exists('name', $data)) {
            $data['name'] = trim((string)$data['name']);
        }

        $lgu->fill($data);
        $lgu->save();

        return $lgu->fresh();
    }

    public function addBarangay(Lgu $lgu, array $data): Barangay
    {
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'Barangay name is required.']);
        }

        return $lgu->barangays()->create([
            'name' => $name,
            'is_active' => array_key_exists('is_active', $data) ? (bool)$data['is_active'] : true,
        ]);
    }

    public function upsertYearStat(Lgu $lgu, int $year, ?int $population, $areaKm2): LguYearStat
    {
        return DB::transaction(function () use ($lgu, $year, $population, $areaKm2) {
            $stat = LguYearStat::query()
                ->where('lgu_id', $lgu->id)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if (!$stat) {
                $stat = new LguYearStat([
                    'lgu_id' => $lgu->id,
                    'year' => $year,
                ]);
            }

            $stat->population = $population;
            $stat->area_km2 = $areaKm2;
            $stat->save();

            return $stat->fresh();
        });
    }
}
