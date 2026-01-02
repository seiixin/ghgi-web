\
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateBarangayRequest;
use App\Models\Barangay;
use Illuminate\Http\RedirectResponse;

class BarangayController extends Controller
{
    public function update(UpdateBarangayRequest $request, Barangay $barangay): RedirectResponse
    {
        $barangay->fill($request->validated());
        $barangay->save();

        return back();
    }
}
