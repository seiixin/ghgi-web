<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class SubmissionsController extends Controller
{
    public function index()
    {
        $rows = [
            ['id' => 'S-0001', 'source' => 'mobile-app', 'status' => 'pending', 'created_at' => now()->subDays(2)->toDateTimeString()],
            ['id' => 'S-0002', 'source' => 'mobile-app', 'status' => 'approved', 'created_at' => now()->subDay()->toDateTimeString()],
        ];

        return Inertia::render('Admin/Submissions/Index', [
            'rows' => $rows,
        ]);
    }
}
