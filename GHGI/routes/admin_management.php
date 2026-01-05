<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'role:ADMIN'])
    ->prefix('admin/management')
    ->group(function () {

        // ✅ Management → Forms (NEW Module 2 UI)
        Route::get('/forms', fn () => Inertia::render('Admin/Forms/Index'))
            ->name('admin.management.forms.index');

        Route::get('/forms/create', fn () => Inertia::render('Admin/Forms/Create'))
            ->name('admin.management.forms.create');

        Route::get('/forms/{id}', fn (string $id) => Inertia::render('Admin/Forms/View', ['id' => $id]))
            ->name('admin.management.forms.view');

        Route::get('/forms/{id}/edit', fn (string $id) => Inertia::render('Admin/Forms/Edit', ['id' => $id]))
            ->name('admin.management.forms.edit');

        // ✅ Other Management pages (keep)
        Route::get('/quantification-settings', fn () => Inertia::render('Admin/Management/QuantificationSettings'))
            ->name('admin.management.quantification');

        Route::get('/emission-settings', fn () => Inertia::render('Admin/Management/EmissionSettings'))
            ->name('admin.management.emission');

        Route::get('/staff', fn () => Inertia::render('Admin/Management/StaffManagement'))
            ->name('admin.management.staff');

        Route::get('/layers', fn () => Inertia::render('Admin/Management/LayersSettings'))
            ->name('admin.management.layers');
    });
