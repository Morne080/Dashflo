<?php

namespace App\Jobs;

use App\Models\IntegrationFact;
use App\Services\LeadVerification\LeadVerificationOrchestrator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class VerifyIntegrationFactsForEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $ingestionEventId,
    ) {}

    public function handle(LeadVerificationOrchestrator $orchestrator): void
    {
        $facts = IntegrationFact::query()
            ->where('ingestion_event_id', $this->ingestionEventId)
            ->with('integrationSource')
            ->get();

        foreach ($facts as $fact) {
            $orchestrator->run($fact);
        }
    }
}
