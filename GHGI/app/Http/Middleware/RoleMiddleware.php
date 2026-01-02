<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        if (strtoupper((string)$user->role) !== strtoupper($role)) {
            abort(403, 'Forbidden');
        }

        return $next($request);
    }
}
