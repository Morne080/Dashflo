const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

/**
 * Negative values render as "-$273.37" (leading minus, not accounting parentheses).
 */
export function formatCurrency(n: number): string {
    if (!Number.isFinite(n)) {
        return '—';
    }
    const formatted = currencyFormatter.format(Math.abs(n));
    return n < 0 ? `-${formatted}` : formatted;
}

export function formatNumber(n: number): string {
    if (!Number.isFinite(n)) {
        return '—';
    }
    return numberFormatter.format(n);
}

const percentFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Supports large magnitudes (e.g. -27,337.14%) with grouping. */
export function formatPercent(n: number): string {
    if (!Number.isFinite(n)) {
        return '—';
    }
    return `${percentFormatter.format(n)}%`;
}
