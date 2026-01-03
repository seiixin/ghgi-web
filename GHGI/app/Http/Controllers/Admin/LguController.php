<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLguRequest;
use App\Http\Requests\Admin\UpdateLguRequest;
use App\Models\Lgu;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class LguController extends Controller
{
    public function index(): Response
    {
        $rows = Lgu::query()
            ->withCount(['barangays'])
            ->orderBy('name')
            ->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'code' => $l->code,
                'name' => $l->name,
                'is_active' => $l->is_active,
                'barangays_count' => $l->barangays_count,
            ]);

        return Inertia::render('Admin/Lgus/Index', [
            'rows' => $rows,
        ]);
    }

    public function show(Lgu $lgu): Response
    {
        $lgu->load([
            'barangays' => fn ($q) => $q->orderBy('name'),
            'yearStats' => fn ($q) => $q->orderByDesc('year'),
        ]);

        return Inertia::render('Admin/Lgus/Show', [
            'lgu' => [
                'id' => $lgu->id,
                'code' => $lgu->code,
                'name' => $lgu->name,
                'is_active' => $lgu->is_active,
            ],
            'barangays' => $lgu->barangays->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'is_active' => $b->is_active,
            ]),
            'stats' => $lgu->yearStats->map(fn ($s) => [
                'id' => $s->id,
                'year' => $s->year,
                'population' => $s->population,
                'area_km2' => $s->area_km2,
            ]),
        ]);
    }

    public function store(StoreLguRequest $request, MasterDataService $svc): RedirectResponse
    {
        $lgu = $svc->createLgu($request->validated());
        return redirect()->route('admin.lgus.show', $lgu);
    }

    public function update(UpdateLguRequest $request, Lgu $lgu, MasterDataService $svc): RedirectResponse
    {
        $svc->updateLgu($lgu, $request->validated());
        return back();
    }
}
