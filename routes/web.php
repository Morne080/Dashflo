<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DashboardExportController;
use App\Http\Controllers\DashboardFilterColumnValuesController;
use App\Http\Controllers\DashboardsController;
use App\Http\Controllers\DashboardWidgetController;
use App\Http\Controllers\IntegrationsController;
use App\Http\Controllers\IntegrationSourceController;
use App\Http\Controllers\IntegrationSourceWidgetFieldsController;
use App\Http\Controllers\LeadImportChunkController;
use App\Http\Controllers\LeadImportController;
use App\Http\Controllers\LeadsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WebhookIngestController;
use App\Http\Controllers\WidgetPreviewController;
use Illuminate\Support\Facades\Route;

Route::post('/hooks/ingest/{token}', [WebhookIngestController::class, 'store'])
    ->middleware('throttle:webhooks')
    ->name('integrations.webhook.ingest');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', [DashboardController::class, 'home'])->name('dashboard');

    Route::get('/dashboards', [DashboardsController::class, 'index'])->name('dashboards.index');
    Route::post('/dashboards', [DashboardsController::class, 'store'])->name('dashboards.store');
    Route::get('/dashboards/{dashboard}', [DashboardController::class, 'show'])->name('dashboards.show');
    Route::patch('/dashboards/{dashboard}', [DashboardsController::class, 'update'])->name('dashboards.update');
    Route::delete('/dashboards/{dashboard}', [DashboardsController::class, 'destroy'])->name('dashboards.destroy');
    Route::post('/dashboards/{dashboard}/duplicate', [DashboardsController::class, 'duplicate'])->name('dashboards.duplicate');
    Route::post('/dashboards/{dashboard}/set-default', [DashboardsController::class, 'setDefault'])->name('dashboards.set-default');

    Route::post('/dashboards/{dashboard}/filters', [DashboardsController::class, 'syncFilters'])
        ->name('dashboards.filters.sync');
    Route::post('/dashboards/{dashboard}/filters/reset', [DashboardsController::class, 'resetFilters'])
        ->name('dashboards.filters.reset');

    Route::post('/dashboards/{dashboard}/widgets/sync', [DashboardWidgetController::class, 'sync'])
        ->name('dashboards.widgets.sync');

    Route::post('/api/widget-preview', [WidgetPreviewController::class, 'show'])
        ->name('api.widget.preview');

    Route::get('/api/dashboards/filter-column-values', DashboardFilterColumnValuesController::class)
        ->name('dashboard.filter-column-values');

    Route::get('/api/integration-sources/{integration_source}/widget-fields', IntegrationSourceWidgetFieldsController::class)
        ->name('api.integration-sources.widget-fields');

    Route::get('/api/export/{table}', [DashboardExportController::class, 'export'])
        ->where('table', '[a-z_]+')
        ->name('dashboard.export');

    Route::get('/leads', [LeadsController::class, 'index'])->name('leads.index');
    Route::post('/leads/import/chunk/start', [LeadImportChunkController::class, 'start'])
        ->middleware('throttle:60,1')
        ->name('leads.import.chunk.start');
    Route::post('/leads/import/chunk/push', [LeadImportChunkController::class, 'push'])
        ->middleware('throttle:5000,1')
        ->name('leads.import.chunk.push');
    Route::post('/leads/import/chunk/commit', [LeadImportChunkController::class, 'commit'])
        ->middleware('throttle:30,1')
        ->name('leads.import.chunk.commit');
    Route::post('/leads/import', LeadImportController::class)->name('leads.import');
    Route::get('/leads/{integration_fact}', [LeadsController::class, 'show'])->name('leads.show');
    Route::patch('/leads/{integration_fact}', [LeadsController::class, 'update'])->name('leads.update');

    Route::get('/integrations', [IntegrationsController::class, 'index'])->name('integrations.index');
    Route::get('/integrations/sources/create', [IntegrationSourceController::class, 'create'])->name('integrations.sources.create');
    Route::get('/integrations/sources/{integration_source}/edit', [IntegrationSourceController::class, 'edit'])->name('integrations.sources.edit');
    Route::get('/integrations/sources/{integration_source}', [IntegrationSourceController::class, 'show'])->name('integrations.sources.show');
    Route::get('/integrations/sources/{integration_source}/events/{ingestion_event}/payload', [IntegrationSourceController::class, 'ingestionEventPayload'])->name('integrations.sources.events.payload');
    Route::post('/integrations/sources', [IntegrationSourceController::class, 'store'])->name('integrations.sources.store');
    Route::patch('/integrations/sources/{integration_source}', [IntegrationSourceController::class, 'update'])->name('integrations.sources.update');
    Route::delete('/integrations/sources/{integration_source}', [IntegrationSourceController::class, 'destroy'])->name('integrations.sources.destroy');
    Route::post('/integrations/sources/{integration_source}/sync', [IntegrationSourceController::class, 'sync'])->name('integrations.sources.sync');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/verification-settings', [ProfileController::class, 'updateVerificationSettings'])
        ->name('profile.verification-settings.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
