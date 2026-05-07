import type { DashboardWidgetPayload } from '@/types/dashboard';
import axios from 'axios';

export type WidgetPreviewRequestBody = {
    widget: Record<string, unknown>;
};

export async function postWidgetPreview(
    body: WidgetPreviewRequestBody,
    options?: { signal?: AbortSignal },
): Promise<DashboardWidgetPayload> {
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    const url = `${route('api.widget.preview')}${qs}`;

    const { data } = await axios.post<{ preview: DashboardWidgetPayload }>(url, body, {
        headers: { Accept: 'application/json' },
        signal: options?.signal,
    });

    return data.preview;
}
