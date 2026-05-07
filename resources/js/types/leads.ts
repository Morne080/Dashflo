import type { LaravelPaginator } from './integrations';

export type LeadsTab = 'leads' | 'requests' | 'import';

export interface LeadListRow {
    id: number;
    external_id: string | null;
    received_at: string | null;
    created_at: string | null;
    record_summary: string | null;
    campaign: string | null;
    supplier: string | null;
    platform: string | null;
    source_id: number;
    source_name: string | null;
    ingestion_event_id: number | null;
    delivery_status: string | null;
}

export interface LeadRequestRow {
    id: number;
    source_id: number;
    source_name: string | null;
    created_at: string | null;
    direction: string;
    status: string;
    http_status: number | null;
    facts_created: number;
    bytes_received: number;
    error_message: string | null;
    has_payload: boolean;
}

export interface LeadSourceOption {
    id: number;
    name: string;
}

/** Shown on Import tab — used for chunked uploads of large files. */
export interface LeadImportClientConfig {
    chunkedThresholdKb: number;
    chunkUploadKb: number;
    maxRows: number;
    maxUploadMb: number;
}

export interface LeadsFilters {
    tab: LeadsTab;
    source_id: number | null;
    from: string | null;
    to: string | null;
    q: string | null;
}

export type LeadsIndexProps = {
    tab: LeadsTab;
    sources: LeadSourceOption[];
    filters: LeadsFilters;
    leads: LaravelPaginator<LeadListRow> | null;
    requests: LaravelPaginator<LeadRequestRow> | null;
    flash?: {
        success?: string | null;
    };
    leadImport?: LeadImportClientConfig | null;
} & Record<string, unknown>;

export type LeadFieldBag = 'dimensions' | 'measures';

export interface LeadFieldEditRef {
    bag: LeadFieldBag;
    key: string;
}

export interface LeadDetailField {
    label: string;
    value: string;
    edit: LeadFieldEditRef | null;
}

export interface LeadDetailCustomField {
    key: string;
    storage_key: string;
    bag: LeadFieldBag;
    value: string;
}

export interface LeadShowSummary {
    id: number;
    external_id: string | null;
    record_summary: string | null;
    campaign: string | null;
    supplier: string | null;
    platform: string | null;
    received_at: string | null;
    created_at: string | null;
    delivery_status: string | null;
    ingestion_event_id: number | null;
    verifications: Record<string, unknown> | null;
    source: {
        id: number;
        name: string;
        kind: string;
    };
}

export interface LeadShowOriginating {
    endpoint_label: string;
    endpoint_value: string;
    connector_label: string;
    connector_name: string;
    connector_href: string;
}

export interface LeadShowPayload {
    content: string | null;
    truncated: boolean;
    total_bytes: number;
    message: string | null;
}

export type LeadsShowProps = {
    lead: LeadShowSummary;
    standard_fields: LeadDetailField[];
    custom_fields: LeadDetailCustomField[];
    originating: LeadShowOriginating;
    payload: LeadShowPayload;
    flash?: {
        success: string | null;
    };
} & Record<string, unknown>;
