import { cn } from '@/lib/utils';
import {
    formatCurrency,
    formatNumber,
    formatPercent,
} from '@/lib/format';
import { useId, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

export interface KpiCardProps {
    label: string;
    value: number;
    format?: 'currency' | 'number' | 'percent';
    previousValue?: number;
    percentChange?: number;
    sparklineData: Array<{ date: string; value: number; prev_value: number }>;
}

function formatValue(value: number, format: KpiCardProps['format']): string {
    switch (format) {
        case 'percent':
            return formatPercent(value);
        case 'number':
            return formatNumber(value);
        case 'currency':
        default:
            return formatCurrency(value);
    }
}

function formatChangeLine(percentChange: number): string {
    const sign = percentChange > 0 ? '+' : '';
    return `${sign}${percentChange.toFixed(1)}%`;
}

export function KpiCard({
    label,
    value,
    format = 'currency',
    percentChange,
    sparklineData,
}: KpiCardProps) {
    const gradientId = useId().replace(/:/g, '');

    const chartData = useMemo(
        () =>
            sparklineData.map((d) => ({
                date: d.date,
                value: d.value,
                prev_value: d.prev_value,
            })),
        [sparklineData],
    );

    const showChange = percentChange !== undefined && !Number.isNaN(percentChange);
    const changePositive = showChange && percentChange >= 0;

    return (
        <div
            className={cn(
                'flex min-h-[168px] min-w-0 flex-col rounded-lg border border-border bg-card p-3',
            )}
        >
            <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-primary/70">
                {label}
            </div>
            <div
                className={cn(
                    'mt-1 text-2xl font-bold leading-tight tracking-tight text-[#fafafa]',
                    format === 'currency' && value < 0 && 'text-red-400',
                )}
            >
                {formatValue(value, format)}
            </div>
            {showChange ? (
                <div
                    className={cn(
                        'mt-1 flex items-center gap-1 text-xs font-medium',
                        changePositive ? 'text-emerald-500' : 'text-red-500',
                    )}
                >
                    <span aria-hidden="true">{changePositive ? '▲' : '▼'}</span>
                    <span>{formatChangeLine(percentChange)}</span>
                </div>
            ) : (
                <div className="mt-1 h-4" />
            )}
            <div className="mt-auto h-[60px] w-full min-w-0 shrink-0 pt-1">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id={`kpi-spark-fill-${gradientId}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="var(--primary)"
                                        stopOpacity={0.22}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="var(--primary)"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="prev_value"
                                stroke="var(--muted-foreground)"
                                strokeWidth={1.25}
                                strokeDasharray="4 3"
                                fill="none"
                                isAnimationActive={false}
                                dot={false}
                                activeDot={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                fill={`url(#kpi-spark-fill-${gradientId})`}
                                isAnimationActive={false}
                                dot={false}
                                activeDot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : null}
            </div>
        </div>
    );
}
