<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'role:ADMIN'])
    ->prefix('admin/management')
    ->group(function () {
        Route::get('/forms', fn () => Inertia::render('Admin/Management/Forms'))->name('admin.mgmt.forms');
        Route::get('/quantification-settings', fn () => Inertia::render('Admin/Management/QuantificationSettings'))->name('admin.mgmt.quantification');
        Route::get('/emission-settings', fn () => Inertia::render('Admin/Management/EmissionSettings'))->name('admin.mgmt.emission');
        Route::get('/staff', fn () => Inertia::render('Admin/Management/StaffManagement'))->name('admin.mgmt.staff');
        Route::get('/layers', fn () => Inertia::render('Admin/Management/LayersSettings'))->name('admin.mgmt.layers');
    });
