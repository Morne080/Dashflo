export type IntegrationSourceKind = 'webhook' | 'rest_api';

export interface IntegrationSourceSummary {
    id: number;
    name: string;
    kind: IntegrationSourceKind;
    enabled: boolean;
    ingest_token: string;
    webhook_url: string;
    rest: {
        base_url: string;
        path: string;
        auth_header: string;
        auth_value_set: boolean;
    };
    facts_count: number;
    last_event_at: string | null;
    created_at: string | null;
    created_by_name: string;
    verification_summary: string;
    inherits_workspace_verification: boolean;
}

export interface IngestionEventSummary {
    id: number;
    source_id: number;
    source_name: string | null;
    source_kind: IntegrationSourceKind | null;
    direction: string;
    status: string;
    http_status: number | null;
    facts_created: number;
    bytes_received: number;
    error_message: string | null;
    created_at: string | null;
}

export interface LaravelPaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface LaravelPaginator<T> {
    data: T[];
    links: LaravelPaginatorLink[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    prev_page_url: string | null;
    next_page_url: string | null;
}

export interface IngestionEventDetailRow {
    id: number;
    direction: string;
    status: string;
    http_status: number | null;
    facts_created: number;
    bytes_received: number;
    idempotency_key: string | null;
    error_message: string | null;
    has_payload: boolean;
    created_at: string | null;
}

export interface IntegrationFactDetailRow {
    id: number;
    external_id: string | null;
    occurred_at: string | null;
    dimensions: Record<string, unknown>;
    measures: Record<string, unknown>;
    verifications: Record<string, unknown> | null;
    created_at: string | null;
}

export interface IntegrationFactIndexRow extends IntegrationFactDetailRow {
    source_id: number;
    source_name: string | null;
}

export interface WebhookFieldRow {
    label: string;
    incoming_key: string;
    static_value: string;
}

export interface WebhookEditorPayload {
    category: string;
    description: string;
    webhook_version: string;
    payload_type: string;
    capture_method: string;
    sample_payload: string;
    encryption_type: string;
    output_timezone: string;
    field_rows: WebhookFieldRow[];
    response_mode: 'json' | 'plain';
    response_plain_body: string;
    custom_headers_enabled: boolean;
}

export type WebhookFormProps = {
    mode: 'create' | 'edit';
    source: {
        id: number;
        name: string;
        enabled: boolean;
        webhook_url: string;
        webhook: WebhookEditorPayload;
    } | null;
    default_webhook?: WebhookEditorPayload;
    flash?: {
        success: string | null;
    };
} & Record<string, unknown>;

export type IntegrationsIndexProps = {
    sources: IntegrationSourceSummary[];
    recentEvents: IngestionEventSummary[];
    recentFacts: LaravelPaginator<IntegrationFactIndexRow>;
    factsCount: number;
    flash: {
        created_source_name: string | null;
    };
} & Record<string, unknown>;

/** Workspace defaults or effective summary (no inherit flag). */
export interface LeadVerificationSettingsClient {
    twilio_lookup: {
        enabled: boolean;
        account_sid: string;
        auth_token_set: boolean;
    };
    email_verification: {
        enabled: boolean;
    };
    trustedform: {
        enabled: boolean;
        api_key_set: boolean;
    };
}

export interface IntegrationSourceVerificationSettings extends LeadVerificationSettingsClient {
    inherit_account_defaults: boolean;
}

export interface IntegrationSourceDetail {
    id: number;
    name: string;
    kind: IntegrationSourceKind;
    enabled: boolean;
    webhook_url: string | null;
    rest: {
        base_url: string;
        path: string;
    };
    verifications: IntegrationSourceVerificationSettings;
}

export type IntegrationSourceShowProps = {
    flash?: {
        success: string | null;
    };
    source: IntegrationSourceDetail;
    account_verifications: LeadVerificationSettingsClient;
    effective_verifications: LeadVerificationSettingsClient;
    events: LaravelPaginator<IngestionEventDetailRow>;
    facts: LaravelPaginator<IntegrationFactDetailRow>;
} & Record<string, unknown>;
