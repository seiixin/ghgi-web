<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Inertia\Inertia;

class MapController extends Controller
{
    public function index()
    {
        $year = (int) (Setting::get('default_year') ?? 2023);

        $mapDefaults = [
            'center_lat' => (float) (Setting::get('map_center_lat') ?? 14.17),
            'center_lng' => (float) (Setting::get('map_center_lng') ?? 121.24),
            'zoom' => (int) (Setting::get('map_zoom') ?? 10),
        ];

        return Inertia::render('Admin/Map/Index', [
            'year' => $year,
            'mapDefaults' => $mapDefaults,
        ]);
    }
}
