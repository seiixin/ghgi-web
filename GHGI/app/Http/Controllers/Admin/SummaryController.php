<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Inertia\Inertia;

class SummaryController extends Controller
{
    public function index()
    {
        $year = (int) (Setting::get('default_year') ?? 2023);

        return Inertia::render('Admin/Summary/Index', [
            'year' => $year,
        ]);
    }
}
