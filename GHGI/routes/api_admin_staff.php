<?php

use App\Http\Controllers\Api\Admin\StaffController;
use Illuminate\Support\Facades\Route;

/**
 * Staff Management API Routes
 *
 * Mount this file from routes/api.php:
 *   require __DIR__ . '/api_admin_staff.php';
 *
 * Final paths:
 *   /api/admin/staff
 *   /api/admin/staff/{id}
 *   /api/admin/staff/{id}/reset-password
 *
 * Protection:
 * - auth:sanctum (Breeze API auth)
 * - role:ADMIN (your RoleMiddleware checks users.role)
 */
Route::middleware(['auth:sanctum', 'role:ADMIN'])
    ->prefix('admin')
    ->as('api.admin.') // optional route names
    ->group(function () {
        Route::get('/staff', [StaffController::class, 'index'])->name('staff.index');
        Route::post('/staff', [StaffController::class, 'store'])->name('staff.store');
        Route::patch('/staff/{id}', [StaffController::class, 'update'])->name('staff.update');
        Route::post('/staff/{id}/reset-password', [StaffController::class, 'resetPassword'])->name('staff.reset_password');
    });
