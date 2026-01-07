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
     * GET /api/admin/staff
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

        // normalized response for React
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
     * POST /api/admin/staff
     * Body:
     * - name, email, role (ADMIN|ENUMERATOR|REVIEWER)
     * - password (optional; auto-generate if missing)
     * - status (optional if users.status exists)
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

        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($plain),
            'role' => strtoupper($validated['role']),
        ];

        if ($hasStatus && array_key_exists('status', $validated) && $validated['status'] !== null) {
            $payload['status'] = $validated['status'];
        }

        $user = User::create($payload);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $hasStatus ? ($user->status ?? null) : null,
            ],
            'temp_password' => $plain,
        ], 201);
    }

    /**
     * PATCH /api/admin/staff/{id}
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
     * POST /api/admin/staff/{id}/reset-password
     * Returns a temporary password (admin action)
     */
    public function resetPassword(Request $request, int $id)
    {
        $user = User::findOrFail($id);

        $temp = Str::password(12);
        $user->password = Hash::make($temp);
        $user->save();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'email' => $user->email,
            ],
            'temp_password' => $temp,
        ]);
    }
}
