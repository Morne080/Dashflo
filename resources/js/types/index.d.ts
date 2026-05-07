export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

import type { AvailableMetricDefinition, AvailableWidgetDefinition } from './catalog';
import type { DashboardsIndexProps } from './dashboard';
import type { IntegrationSourceShowProps, IntegrationsIndexProps, WebhookFormProps } from './integrations';
import type { LeadsIndexProps, LeadsShowProps } from './leads';
import type { ProfileEditProps } from './profile';

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    /** Code-defined dashboard widget catalog (`App\Dashboards\Registry`). */
    availableWidgets?: AvailableWidgetDefinition[];
    /** Code-defined dashboard metric catalog (`App\Dashboards\Registry`). */
    availableMetrics?: AvailableMetricDefinition[];
};

export type DashboardsIndexPageProps = PageProps<DashboardsIndexProps>;

export type IntegrationsIndexPageProps = PageProps<IntegrationsIndexProps>;

export type IntegrationSourceShowPageProps = PageProps<IntegrationSourceShowProps>;

export type WebhookFormPageProps = PageProps<WebhookFormProps>;

export type LeadsIndexPageProps = PageProps<LeadsIndexProps>;

export type LeadsShowPageProps = PageProps<LeadsShowProps>;

export type ProfileEditPageProps = PageProps<ProfileEditProps>;
