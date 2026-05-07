import {
    optionsFromFilterMap,
    shouldFetchRemoteFilterValues,
    showTrafficSourceScope,
    stringifyPicklistOptions,
} from '@/lib/dashboardFilterFieldValues';
import { isStandardFilterKey } from '@/lib/dashboardFilterStandardDimensions';
import type { DashboardFilterOptions } from '@/types/dashboard';
import axios, { isCancel } from 'axios';
import { useEffect, useMemo, useState } from 'react';

/**
 * Distinct picklist values for a dashboard filter column (toolbar or sheet), optionally scoped by traffic {@see Lead::$source}.
 */
export function useDistinctDashboardFilterValues(
    column: string | null,
    trafficSource: string | null | undefined,
    filterOptions: DashboardFilterOptions,
): {
    options: string[];
    loading: boolean;
    error: string | null;
    fetchRemote: boolean;
} {
    const traffic = (trafficSource ?? '').trim();

    const staticOpts = useMemo(() => {
        if (!column || isStandardFilterKey(column)) {
            return null;
        }
        return optionsFromFilterMap(column, filterOptions);
    }, [column, filterOptions]);

    const fetchRemote = useMemo(
        () => shouldFetchRemoteFilterValues(column, traffic, filterOptions),
        [column, traffic, filterOptions],
    );

    const [remoteValues, setRemoteValues] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!column || isStandardFilterKey(column)) {
            setRemoteValues([]);
            setLoading(false);
            setError(null);
            return;
        }
        if (!fetchRemote) {
            setRemoteValues([]);
            setLoading(false);
            setError(null);
            return;
        }

        const ac = new AbortController();
        setLoading(true);
        setError(null);
        setRemoteValues([]);

        const params: Record<string, string> = { column };
        if (traffic !== '' && showTrafficSourceScope(column)) {
            params.traffic_source = traffic;
        }

        axios
            .get<{ values: string[] }>(route('dashboard.filter-column-values'), {
                params,
                signal: ac.signal,
            })
            .then((res) => {
                setRemoteValues(stringifyPicklistOptions(res.data.values ?? []));
            })
            .catch((err: unknown) => {
                if (isCancel(err)) {
                    return;
                }
                setRemoteValues([]);
                setError('Could not load values.');
            })
            .finally(() => {
                setLoading(false);
            });

        return () => ac.abort();
    }, [column, traffic, fetchRemote]);

    const options = useMemo(() => {
        if (!column || isStandardFilterKey(column)) {
            return [];
        }
        if (fetchRemote) {
            return remoteValues;
        }
        return staticOpts ?? [];
    }, [column, fetchRemote, remoteValues, staticOpts]);

    return { options, loading, error, fetchRemote };
}
