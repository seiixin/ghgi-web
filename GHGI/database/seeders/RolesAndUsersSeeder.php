<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class RolesAndUsersSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => 'Admin User', 'password' => Hash::make('password'), 'role' => 'ADMIN']
        );

        User::query()->updateOrCreate(
            ['email' => 'enum@example.com'],
            ['name' => 'Enumerator User', 'password' => Hash::make('password'), 'role' => 'ENUMERATOR']
        );
    }
}
