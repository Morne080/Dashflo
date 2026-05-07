<?php

namespace App\Policies;

use App\Models\Dashboard;
use App\Models\User;

class DashboardPolicy
{
    public function view(User $user, Dashboard $dashboard): bool
    {
        return (int) $dashboard->user_id === (int) $user->id;
    }

    public function update(User $user, Dashboard $dashboard): bool
    {
        return (int) $dashboard->user_id === (int) $user->id;
    }

    public function delete(User $user, Dashboard $dashboard): bool
    {
        if ((int) $dashboard->user_id !== (int) $user->id) {
            return false;
        }

        return $user->dashboards()->count() > 1;
    }
}
