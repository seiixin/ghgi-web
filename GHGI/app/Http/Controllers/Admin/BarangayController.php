<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateBarangayRequest;
use App\Models\Barangay;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

class BarangayController extends Controller
{
    public function update(UpdateBarangayRequest $request, Barangay $barangay): RedirectResponse
    {
        $barangay->update($request->validated());

        // Avoid return back() to prevent redirect loops in Inertia/XHR flows.
        // Always redirect to a stable GET route.
        // Assumes your LGU show route is named: admin.lgus.show
        // and Barangay has lgu_id FK.
        return Redirect::route('admin.lgus.show', $barangay->lgu_id)
            ->with('success', 'Barangay updated.');
    }
}
