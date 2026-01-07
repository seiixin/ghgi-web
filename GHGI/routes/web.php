<?php
// routes/web.php

use App\Http\Controllers\ProfileController;
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

use App\Http\Controllers\Admin\FormsAdminController;

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
// ------------------------------------------------------
Route::get('/', function () {
    return auth()->check()
        ? redirect('/admin/dashboard')
        : redirect()->route('login');
});

Route::get('/dashboard', function () {
    return redirect('/admin/dashboard');
})->middleware(['auth'])->name('dashboard');

// ------------------------------------------------------
// Authenticated: Profile + App
// ------------------------------------------------------
Route::middleware('auth')->group(function () {
    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ------------------------------------------------------
    // Unified app pages (VISIBLE to ADMIN + ENUMERATOR)
    // ------------------------------------------------------
    Route::prefix('admin')->group(function () {
        // View pages (no role gate)
        Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('admin.dashboard');
        Route::get('/quantification', [QuantificationController::class, 'index'])->name('admin.quantification');
        Route::get('/summary', [SummaryController::class, 'index'])->name('admin.summary');
        Route::get('/map', [MapController::class, 'index'])->name('admin.map');
        Route::get('/submissions', [SubmissionsController::class, 'index'])->name('admin.submissions');

        // Admin-only CRUD endpoints (existing)
        Route::middleware(['role:ADMIN'])->group(function () {
            Route::post('/submissions', [SubmissionsController::class, 'store'])->name('admin.submissions.store');
            Route::patch('/submissions/{id}', [SubmissionsController::class, 'update'])->name('admin.submissions.update');
            Route::delete('/submissions/{id}', [SubmissionsController::class, 'destroy'])->name('admin.submissions.destroy');
        });

        // LGU (existing)
        Route::get('/lgus', [LguController::class, 'index'])->name('admin.lgus.index');
        Route::get('/lgus/{lgu}', [LguController::class, 'show'])->name('admin.lgus.show');

        Route::middleware(['role:ADMIN'])->group(function () {
            Route::post('/lgus', [LguController::class, 'store'])->name('admin.lgus.store');
            Route::patch('/lgus/{lgu}', [LguController::class, 'update'])->name('admin.lgus.update');

            Route::post('/lgus/{lgu}/barangays', [LguBarangayController::class, 'store'])->name('admin.lgus.barangays.store');
            Route::patch('/barangays/{barangay}', [BarangayController::class, 'update'])->name('admin.barangays.update');

            Route::post('/lgus/{lgu}/stats', [LguYearStatController::class, 'store'])->name('admin.lgus.stats.store');
            Route::patch('/lgu-stats/{stat}', [LguYearStatController::class, 'update'])->name('admin.lgu-stats.update');
        });
    });

    // ------------------------------------------------------
    // Module 2 — Forms Management API (session-auth, same-origin)
    // Frontend calls: /api/admin/forms...
    // ------------------------------------------------------
    Route::prefix('api')->group(function () {
        // Admin CRUD
        Route::middleware(['role:ADMIN'])->prefix('admin')->group(function () {
            Route::get('/forms', [FormsAdminController::class, 'index']);
            Route::post('/forms', [FormsAdminController::class, 'store']);
            Route::patch('/forms/{formType}', [FormsAdminController::class, 'update']);

            Route::post('/forms/{formType}/schemas', [FormsAdminController::class, 'storeSchema']);
            Route::patch('/forms/schemas/{schemaVersion}', [FormsAdminController::class, 'patchSchemaStatus']);

            Route::post('/forms/{formType}/mapping', [FormsAdminController::class, 'saveMapping']);
            Route::delete('/forms/{id}', [FormsAdminController::class, 'destroy'])
            ->name('api.admin.forms.destroy');
        });

        // Public read (optional later)
        // Route::get('/forms', ...);
        // Route::get('/forms/{key}/schema', ...);
    });
});



require __DIR__ . '/api_admin_staff.php';

require __DIR__ . '/api_submissions.php';
// ------------------------------------------------------
// Admin dropdown "Management" pages (admin-only)
// ------------------------------------------------------
require __DIR__ . '/admin_management.php';

// Breeze auth routes
require __DIR__ . '/auth.php';
