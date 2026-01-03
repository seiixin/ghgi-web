<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth','role:ADMIN'])->prefix('admin/management')->group(function () {
    // placeholders (wire to your existing controllers/pages later)
    Route::get('/forms', fn () => inertia('Admin/Management/Forms'))->name('admin.mgmt.forms');
    Route::get('/quantification-settings', fn () => inertia('Admin/Management/QuantificationSettings'))->name('admin.mgmt.quant.settings');
    Route::get('/emission-settings', fn () => inertia('Admin/Management/EmissionSettings'))->name('admin.mgmt.emission.settings');
    Route::get('/staff', fn () => inertia('Admin/Management/StaffManagement'))->name('admin.mgmt.staff');
    Route::get('/layers', fn () => inertia('Admin/Management/LayersSettings'))->name('admin.mgmt.layers');
});
