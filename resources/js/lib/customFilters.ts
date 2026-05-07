import type { CustomFilterRow } from '@/types/dashboard';

/** Client-side cleanup for widget filter overrides (server validates columns). */
export function normalizeCustomFilterRows(raw: unknown): CustomFilterRow[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    const out: CustomFilterRow[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') {
            continue;
        }
        const field = String((row as { field?: unknown }).field ?? '').trim();
        const value = String((row as { value?: unknown }).value ?? '').trim();
        const scopeRaw = String((row as { scope?: unknown }).scope ?? '').trim();
        const scope = scopeRaw === 'fact' ? 'fact' : scopeRaw === 'lead' ? 'lead' : undefined;
        if (!field || !value) {
            continue;
        }
        const normalized: CustomFilterRow = { field, value };
        if (scope !== undefined) {
            normalized.scope = scope;
        }
        out.push(normalized);
        if (out.length >= 10) {
            break;
        }
    }
    return out;
}
