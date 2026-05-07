import axios from 'axios';

export type IntegrationWidgetFieldsResponse = {
    dimension_keys: string[];
    measure_keys: string[];
    fact_fields: Array<{ path: string; label: string }>;
};

export async function fetchIntegrationWidgetFields(
    integrationSourceId: number,
    options?: { signal?: AbortSignal },
): Promise<IntegrationWidgetFieldsResponse> {
    const url = route('api.integration-sources.widget-fields', integrationSourceId);
    const { data } = await axios.get<IntegrationWidgetFieldsResponse>(url, {
        headers: { Accept: 'application/json' },
        signal: options?.signal,
    });

    return data;
}
