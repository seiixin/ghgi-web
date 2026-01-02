\
<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Admin\LguController;
use App\Http\Controllers\Admin\LguBarangayController;
use App\Http\Controllers\Admin\BarangayController;
use App\Http\Controllers\Admin\LguYearStatController;

Route::middleware(['auth'])->prefix('admin')->group(function () {
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
