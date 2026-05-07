import type { DashboardFilterOptions } from '@/types/dashboard';

/** First-class URL/query dimensions (matches PHP {@see \App\DTO\FilterRequest}). */
export const STANDARD_DIMENSIONS = [
    { key: 'source', label: 'Source', optionsProp: 'sources' as const },
    { key: 'status', label: 'Status', optionsProp: 'statuses' as const },
    { key: 'vertical', label: 'Vertical', optionsProp: 'verticals' as const },
    { key: 'sol', label: 'SOL', optionsProp: 'accident_sols' as const },
    { key: 'state', label: 'State', optionsProp: 'states' as const },
    { key: 'supplier_code', label: 'Supplier', optionsProp: 'supplier_codes' as const },
    { key: 'buyer_code', label: 'Buyer', optionsProp: 'buyer_codes' as const },
] as const;

export type StandardFilterKey = (typeof STANDARD_DIMENSIONS)[number]['key'];

export const STANDARD_KEY_SET = new Set<string>(STANDARD_DIMENSIONS.map((d) => d.key));

export function isStandardFilterKey(field: string): field is StandardFilterKey {
    return STANDARD_KEY_SET.has(field);
}

export function standardOptions(key: StandardFilterKey, fo: DashboardFilterOptions): string[] {
    switch (key) {
        case 'source':
            return fo.sources;
        case 'status':
            return fo.statuses;
        case 'vertical':
            return fo.verticals;
        case 'sol':
            return fo.accident_sols;
        case 'state':
            return fo.states;
        case 'supplier_code':
            return fo.supplier_codes;
        case 'buyer_code':
            return fo.buyer_codes;
        default: {
            const _exhaustive: never = key;
            return _exhaustive;
        }
    }
}

export function labelForStandardKey(key: StandardFilterKey): string {
    const row = STANDARD_DIMENSIONS.find((d) => d.key === key);
    return row?.label ?? key;
}
