<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class StaffController extends Controller
{
    /**
     * GET /admin/staff   (or /api/admin/staff depending on your routes)
     * Query params:
     * - q (search by name/email)
     * - role (ADMIN|ENUMERATOR|REVIEWER)
     * - status (optional if users.status exists)
     * - page, per_page
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $role = strtoupper(trim((string) $request->query('role', '')));
        $status = trim((string) $request->query('status', ''));

        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(5, min(100, $perPage));

        $hasStatus = Schema::hasColumn('users', 'status');

        $users = User::query()
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('name', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%");
                });
            })
            ->when(in_array($role, ['ADMIN', 'ENUMERATOR', 'REVIEWER'], true), function ($query) use ($role) {
                $query->where('role', $role);
            })
            ->when($hasStatus && $status !== '', function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->orderBy('name')
            ->paginate($perPage);

        $rows = $users->getCollection()->map(function (User $u) use ($hasStatus) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'status' => $hasStatus ? ($u->status ?? null) : null,
                'created_at' => optional($u->created_at)->toISOString(),
                'updated_at' => optional($u->updated_at)->toISOString(),
            ];
        });

        return response()->json([
            'data' => $rows,
            'meta' => [
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'last_page' => $users->lastPage(),
            ],
        ]);
    }

    /**
     * POST /admin/staff
     * Body:
     * - name, email, role (ADMIN|ENUMERATOR|REVIEWER)
     * - password (optional; auto-generate if missing)
     * - status (optional if users.status exists)
     *
     * IMPORTANT:
     * Your User model has password => 'hashed' cast.
     * So assign PLAIN password and let Eloquent cast hash it.
     */
    public function store(Request $request)
    {
        $hasStatus = Schema::hasColumn('users', 'status');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string', 'in:ADMIN,ENUMERATOR,REVIEWER'],
            'password' => ['nullable', 'string', 'min:8'],
            'status' => [$hasStatus ? 'nullable' : 'prohibited', 'string', 'max:32'],
        ]);

        $plain = $validated['password'] ?? Str::password(12);

        $user = new User();
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->role = strtoupper($validated['role']);

        // IMPORTANT: assign plain, cast will hash on save
        $user->password = $plain;

        if ($hasStatus && array_key_exists('status', $validated) && $validated['status'] !== null) {
            $user->status = $validated['status'];
        }

        $user->save();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $hasStatus ? ($user->status ?? null) : null,
            ],
            // send back plain only on create (you can remove if you don't want to reveal it)
            'temp_password' => $plain,
        ], 201);
    }

    /**
     * PATCH /admin/staff/{id}
     * Body:
     * - role (ADMIN|ENUMERATOR|REVIEWER) optional
     * - status optional if users.status exists
     * - name optional
     */
    public function update(Request $request, int $id)
    {
        $hasStatus = Schema::hasColumn('users', 'status');

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'in:ADMIN,ENUMERATOR,REVIEWER'],
            'status' => [$hasStatus ? 'nullable' : 'prohibited', 'string', 'max:32'],
        ]);

        $user = User::findOrFail($id);

        if (array_key_exists('name', $validated) && $validated['name'] !== null) {
            $user->name = $validated['name'];
        }

        if (array_key_exists('role', $validated) && $validated['role'] !== null) {
            $user->role = strtoupper($validated['role']);
        }

        if ($hasStatus && array_key_exists('status', $validated)) {
            $user->status = $validated['status'];
        }

        $user->save();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $hasStatus ? ($user->status ?? null) : null,
            ],
        ]);
    }

    /**
     * POST /admin/staff/{id}/reset-password
     *
     * Manual reset (admin action):
     * Body:
     * - current_password (admin's current password) required
     * - new_password required
     * - new_password_confirmation required (because of 'confirmed')
     *
     * IMPORTANT:
     * Assign PLAIN new_password so User cast hashes it.
     */
    public function resetPassword(Request $request, int $id)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $actor = $request->user();

        // verify admin password
        if (!$actor || !Hash::check($request->input('current_password'), $actor->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user = User::findOrFail($id);

        // IMPORTANT: assign plain, cast will hash on save
        $user->password = $request->input('new_password');

        // invalidate remember-me token
        $user->setRememberToken(Str::random(60));

        $user->save();

        return response()->json([
            'ok' => true,
            'data' => [
                'id' => $user->id,
                'email' => $user->email,
            ],
        ]);
    }
}
