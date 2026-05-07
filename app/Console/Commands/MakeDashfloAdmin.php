<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class MakeDashfloAdmin extends Command
{
    protected $signature = 'dashflo:make-admin
                            {email : Email address for the administrator account}
                            {password : Plain-text password (same rules as registration)}';

    protected $description = 'Create a new admin user or promote an existing user (sets is_admin = true).';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $password = (string) $this->argument('password');

        $validator = Validator::make(
            ['email' => $email, 'password' => $password],
            [
                'email' => ['required', 'string', 'email', 'max:255'],
                'password' => ['required', 'string', Password::defaults()],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $existing = User::query()->where('email', $email)->first();

        if ($existing === null) {
            User::query()->create([
                'name' => 'Administrator',
                'email' => $email,
                'password' => $password,
                'email_verified_at' => now(),
                'is_admin' => true,
            ]);
            $this->info("Created admin user: {$email}");
        } else {
            $existing->forceFill([
                'password' => $password,
                'is_admin' => true,
                'email_verified_at' => $existing->email_verified_at ?? now(),
            ])->save();
            $this->info("Updated password and granted admin: {$email}");
        }

        $this->comment('Sign in at /login. Change this password after first login if this was a temporary one.');

        return self::SUCCESS;
    }
}
