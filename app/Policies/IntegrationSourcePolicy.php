<?php

namespace App\Policies;

use App\Models\IntegrationSource;
use App\Models\User;

class IntegrationSourcePolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    public function view(User $user, IntegrationSource $integrationSource): bool
    {
        return (int) $integrationSource->user_id === (int) $user->id;
    }

    public function update(User $user, IntegrationSource $integrationSource): bool
    {
        return (int) $integrationSource->user_id === (int) $user->id;
    }

    public function delete(User $user, IntegrationSource $integrationSource): bool
    {
        return (int) $integrationSource->user_id === (int) $user->id;
    }
}
