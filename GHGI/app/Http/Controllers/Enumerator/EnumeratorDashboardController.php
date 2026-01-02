<?php

namespace App\Http\Controllers\Enumerator;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Inertia\Inertia;

class EnumeratorDashboardController extends Controller
{
    public function index()
    {
        $year = (int) (Setting::get('default_year') ?? 2023);

        return Inertia::render('Enumerator/Dashboard', [
            'year' => $year,
        ]);
    }
}
