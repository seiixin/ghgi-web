<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\QuantificationController;
use App\Http\Controllers\Admin\SummaryController;
use App\Http\Controllers\Admin\MapController;
use App\Http\Controllers\Admin\SubmissionsController;
use App\Http\Controllers\Admin\LguController;
use App\Http\Controllers\Admin\LguBarangayController;
use App\Http\Controllers\Admin\BarangayController;
use App\Http\Controllers\Admin\LguYearStatController;

// ------------------------------------------------------
// Shared props (keep here if you’re not using HandleInertiaRequests)
// ------------------------------------------------------
Inertia::share([
    'app' => [
        'name' => config('app.name'),
    ],
    'auth' => fn () => [
        'user' => auth()->check() ? [
            'id' => auth()->id(),
            'name' => auth()->user()->name,
            'email' => auth()->user()->email,
            'role' => auth()->user()->role,
        ] : null,
    ],
]);

// ------------------------------------------------------
// Landing
// - If logged in: go to unified app pages (/admin/dashboard)
// - If not: go to login
// ------------------------------------------------------
Route::get('/', function () {
    return auth()->check()
        ? redirect('/admin/dashboard')
        : redirect()->route('login');
});

// Optional: keep /dashboard for Breeze redirects
Route::get('/dashboard', function () {
    return redirect('/admin/dashboard');
})->middleware(['auth'])->name('dashboard');

// ------------------------------------------------------
// Authenticated: Profile
// ------------------------------------------------------
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ------------------------------------------------------
    // Unified app pages (VISIBLE to ADMIN + ENUMERATOR)
    // Sidebar points here for everyone.
    // ------------------------------------------------------
    Route::prefix('admin')->group(function () {
        // View pages (no role gate)
        Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('admin.dashboard');
        Route::get('/quantification', [QuantificationController::class, 'index'])->name('admin.quantification');
        Route::get('/summary', [SummaryController::class, 'index'])->name('admin.summary');
        Route::get('/map', [MapController::class, 'index'])->name('admin.map');
        Route::get('/submissions', [SubmissionsController::class, 'index'])->name('admin.submissions');

        // Admin-only CRUD endpoints (future)
        Route::middleware(['role:ADMIN'])->group(function () {
            Route::post('/submissions', [SubmissionsController::class, 'store'])->name('admin.submissions.store');
            Route::patch('/submissions/{id}', [SubmissionsController::class, 'update'])->name('admin.submissions.update');
            Route::delete('/submissions/{id}', [SubmissionsController::class, 'destroy'])->name('admin.submissions.destroy');
        });


            // VIEW (auth only)
        Route::get('/lgus', [LguController::class, 'index'])->name('admin.lgus.index');
        Route::get('/lgus/{lgu}', [LguController::class, 'show'])->name('admin.lgus.show');

        // MUTATIONS (admin only)
        Route::middleware(['role:ADMIN'])->group(function () {
            Route::post('/lgus', [LguController::class, 'store'])->name('admin.lgus.store');
            Route::patch('/lgus/{lgu}', [LguController::class, 'update'])->name('admin.lgus.update');

            Route::post('/lgus/{lgu}/barangays', [LguBarangayController::class, 'store'])->name('admin.lgus.barangays.store');
            Route::patch('/barangays/{barangay}', [BarangayController::class, 'update'])->name('admin.barangays.update');

            Route::post('/lgus/{lgu}/stats', [LguYearStatController::class, 'store'])->name('admin.lgus.stats.store');
            Route::patch('/lgu-stats/{stat}', [LguYearStatController::class, 'update'])->name('admin.lgu-stats.update');
        });

    });
});

// ------------------------------------------------------
// Admin dropdown "Management" pages (admin-only)
// From patch ZIP: routes/admin_management.php
// ------------------------------------------------------
require __DIR__ . '/admin_management.php';

// Breeze auth routes (login/register/logout/password/email verification)
require __DIR__ . '/auth.php';
