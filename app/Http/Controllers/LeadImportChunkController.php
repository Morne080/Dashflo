<?php

namespace App\Http\Controllers;

use App\Models\IntegrationSource;
use App\Models\User;
use App\Services\LeadImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

final class LeadImportChunkController extends Controller
{
    private const CACHE_PREFIX = 'lead_import_chunk:';

    public function start(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $maxUploadKb = (int) config('lead_import.max_upload_kb');
        $maxBytes = $maxUploadKb * 1024;

        $validated = $request->validate([
            'integration_source_id' => 'required|integer|exists:integration_sources,id',
            'extension' => 'required|string|in:json,csv,txt',
            'total_bytes' => 'required|integer|min:1|max:'.$maxBytes,
        ]);

        $source = IntegrationSource::query()
            ->forUser($user)
            ->whereKey((int) $validated['integration_source_id'])
            ->firstOrFail();

        $uploadId = (string) Str::uuid();
        $relativePath = 'lead-import-chunks/'.$user->id.'/'.$uploadId.'.part';

        Storage::disk('local')->put($relativePath, '');

        $ttlSeconds = (int) config('lead_import.chunk_session_ttl_seconds');

        Cache::put($this->cacheKey($uploadId), [
            'user_id' => $user->id,
            'integration_source_id' => $source->id,
            'relative_path' => $relativePath,
            'total_bytes' => (int) $validated['total_bytes'],
            'extension' => strtolower((string) $validated['extension']),
        ], now()->addSeconds($ttlSeconds));

        return response()->json([
            'upload_id' => $uploadId,
        ]);
    }

    public function push(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $chunkMaxKb = (int) config('lead_import.chunk_upload_kb');

        $validated = $request->validate([
            'upload_id' => 'required|uuid',
            'chunk' => ['required', 'file', 'max:'.$chunkMaxKb],
        ]);

        $uploadId = (string) $validated['upload_id'];
        $session = Cache::get($this->cacheKey($uploadId));
        if (! is_array($session) || (int) ($session['user_id'] ?? 0) !== (int) $user->id) {
            return response()->json(['message' => 'Invalid or expired upload session.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $relativePath = (string) $session['relative_path'];
        $totalBytes = (int) $session['total_bytes'];
        $absolutePath = Storage::disk('local')->path($relativePath);

        $chunkFile = $request->file('chunk');
        $chunkReal = $chunkFile->getRealPath();
        if ($chunkReal === false) {
            return response()->json(['message' => 'Could not read chunk.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $currentSize = is_file($absolutePath) ? (int) filesize($absolutePath) : 0;
        $chunkSize = (int) ($chunkFile->getSize() ?? 0);
        if ($currentSize + $chunkSize > $totalBytes) {
            return response()->json(['message' => 'Upload exceeds declared file size.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $out = fopen($absolutePath, 'ab');
        if ($out === false) {
            return response()->json(['message' => 'Could not store chunk.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        try {
            $in = fopen($chunkReal, 'rb');
            if ($in === false) {
                return response()->json(['message' => 'Could not read chunk.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            try {
                stream_copy_to_stream($in, $out);
            } finally {
                fclose($in);
            }
        } finally {
            fclose($out);
        }

        $written = (int) filesize($absolutePath);

        return response()->json([
            'written' => $written,
            'total_bytes' => $totalBytes,
        ]);
    }

    public function commit(Request $request, LeadImportService $imports): JsonResponse
    {
        $imports->applyExecutionTimeLimit();

        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'upload_id' => 'required|uuid',
            'integration_source_id' => 'required|integer|exists:integration_sources,id',
        ]);

        $uploadId = (string) $validated['upload_id'];
        $cacheKey = $this->cacheKey($uploadId);
        $session = Cache::get($cacheKey);
        if (! is_array($session) || (int) ($session['user_id'] ?? 0) !== (int) $user->id) {
            return response()->json(['message' => 'Invalid or expired upload session.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ((int) ($session['integration_source_id'] ?? 0) !== (int) $validated['integration_source_id']) {
            return response()->json(['message' => 'Integration source does not match this upload.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $source = IntegrationSource::query()
            ->forUser($user)
            ->whereKey((int) $validated['integration_source_id'])
            ->firstOrFail();

        $relativePath = (string) $session['relative_path'];
        $totalBytes = (int) $session['total_bytes'];
        $extension = (string) $session['extension'];
        $absolutePath = Storage::disk('local')->path($relativePath);

        if (! is_file($absolutePath) || filesize($absolutePath) !== $totalBytes) {
            return response()->json([
                'message' => 'Upload incomplete. Expected '.$totalBytes.' bytes; got '.(is_file($absolutePath) ? filesize($absolutePath) : 0).'.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $outcome = $imports->importFromDiskPath($absolutePath, $extension, $source, $totalBytes);
        } catch (InvalidArgumentException $e) {
            Storage::disk('local')->delete($relativePath);
            Cache::forget($cacheKey);

            return response()->json(['message' => $e->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (Throwable $e) {
            Storage::disk('local')->delete($relativePath);
            Cache::forget($cacheKey);

            return response()->json(['message' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        Storage::disk('local')->delete($relativePath);
        Cache::forget($cacheKey);

        $imports->dispatchVerificationAfterImport($outcome->created, $outcome->eventId);

        $message = $imports->successMessage($outcome->created);
        Session::flash('success', $message);

        return response()->json([
            'redirect' => route('leads.index', [
                'tab' => 'leads',
                'source_id' => $source->id,
            ]),
        ]);
    }

    private function cacheKey(string $uploadId): string
    {
        return self::CACHE_PREFIX.$uploadId;
    }
}
