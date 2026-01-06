<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

class ApiController extends Controller
{
    protected function ok($data = null, string $message = 'OK', int $code = 200)
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    protected function fail(string $message = 'Error', $errors = null, int $code = 400)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors'  => $errors,
        ], $code);
    }

    protected function requireAuth(): User
    {
        if (app()->environment('local')) {
            $asUserId = request()->header('X-User-Id');
            if ($asUserId) {
                $u = User::query()->find($asUserId);
                if ($u) return $u;
            }
        }

        /** @var User|null $u */
        $u = auth()->user();
        abort_if(!$u, 401, 'Unauthenticated');
        return $u;
    }
}
