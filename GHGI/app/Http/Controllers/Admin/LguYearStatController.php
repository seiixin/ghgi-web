\
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLguYearStatRequest;
use App\Http\Requests\Admin\UpdateLguYearStatRequest;
use App\Models\Lgu;
use App\Models\LguYearStat;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class LguYearStatController extends Controller
{
    public function store(StoreLguYearStatRequest $request, Lgu $lgu, MasterDataService $svc): RedirectResponse
    {
        $data = $request->validated();
        $svc->upsertYearStat($lgu, (int)$data['year'], $data['population'] ?? null, $data['area_km2'] ?? null);
        return back();
    }

    public function update(UpdateLguYearStatRequest $request, LguYearStat $stat): RedirectResponse
    {
        $stat->fill($request->validated());
        $stat->save();

        return back();
    }
}
