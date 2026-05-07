<?php

namespace App\Http\Controllers;

use App\Models\IntegrationSource;
use App\Models\User;
use App\Services\LeadImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

final class LeadImportController extends Controller
{
    public function __invoke(Request $request, LeadImportService $imports): RedirectResponse
    {
        $imports->applyExecutionTimeLimit();

        /** @var User $user */
        $user = $request->user();

        $maxUploadKb = (int) config('lead_import.max_upload_kb');
        $validated = $request->validate([
            'integration_source_id' => 'required|integer|exists:integration_sources,id',
            'file' => ['required', 'file', 'max:'.$maxUploadKb],
        ]);

        $source = IntegrationSource::query()
            ->forUser($user)
            ->whereKey((int) $validated['integration_source_id'])
            ->firstOrFail();

        $file = $request->file('file');
        $path = $file->getRealPath();
        if ($path === false) {
            return redirect()
                ->route('leads.index', ['tab' => 'import'])
                ->withErrors(['file' => 'Could not read the uploaded file.']);
        }

        $bytes = (int) ($file->getSize() ?? 0);
        $ext = strtolower((string) $file->getClientOriginalExtension());

        try {
            $outcome = $imports->importFromDiskPath($path, $ext, $source, $bytes);
        } catch (InvalidArgumentException $e) {
            return redirect()
                ->route('leads.index', ['tab' => 'import'])
                ->withErrors(['file' => $e->getMessage()]);
        } catch (Throwable $e) {
            return redirect()
                ->route('leads.index', ['tab' => 'import'])
                ->withErrors(['file' => $e->getMessage()]);
        }

        $imports->dispatchVerificationAfterImport($outcome->created, $outcome->eventId);

        return redirect()->route('leads.index', [
            'tab' => 'leads',
            'source_id' => $source->id,
        ])->with('success', $imports->successMessage($outcome->created));
    }
}
