<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLguYearStatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'population' => ['nullable', 'integer', 'min:0'],
            'area_km2' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
