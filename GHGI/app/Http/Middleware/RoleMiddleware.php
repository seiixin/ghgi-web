<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // If XHR/Inertia and no user, do not redirect (prevents redirect chains)
        if (!$user) {
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                abort(401, 'Unauthenticated');
            }
            return redirect()->route('login');
        }

        $allowed = array_values(array_filter(array_map(
            fn ($r) => strtoupper(trim((string) $r)),
            $roles
        )));

        if (!$allowed) {
            abort(403, 'Forbidden');
        }

        $roleFromRelation = method_exists($user, 'roles')
            ? optional($user->roles()->first())->name
            : null;

        $userRole = strtoupper(trim((string) ($roleFromRelation ?: ($user->role ?? ""))));

        if ($userRole === "" || !in_array($userRole, $allowed, true)) {
            abort(403, 'Forbidden');
        }

        return $next($request);
    }
}
