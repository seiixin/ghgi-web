<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreBarangayRequest;
use App\Models\Lgu;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class LguBarangayController extends Controller
{
    public function store(StoreBarangayRequest $request, Lgu $lgu, MasterDataService $svc): RedirectResponse
    {
        $svc->addBarangay($lgu, $request->validated());
        return back();
    }
}
