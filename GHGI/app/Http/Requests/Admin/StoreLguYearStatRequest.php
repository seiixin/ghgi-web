<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLguYearStatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'min:1900', 'max:2100'],
            'population' => ['nullable', 'integer', 'min:0'],
            'area_km2' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
