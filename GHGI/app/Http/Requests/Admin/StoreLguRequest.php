\
<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLguRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route middleware enforces role
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'unique:lgus,code'],
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
