<?php

namespace App\Policies;

use App\Models\IntegrationFact;
use App\Models\User;

class IntegrationFactPolicy
{
    public function view(User $user, IntegrationFact $integrationFact): bool
    {
        return $integrationFact->integrationSource !== null
            && (int) $integrationFact->integrationSource->user_id === (int) $user->id;
    }

    public function update(User $user, IntegrationFact $integrationFact): bool
    {
        return $this->view($user, $integrationFact);
    }
}
