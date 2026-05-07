import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type Row = Record<string, unknown>;

const DEFAULT_COLORS = [
    'var(--primary)',
    'hsl(142, 70%, 45%)',
    'hsl(38, 92%, 50%)',
    'hsl(199, 89%, 48%)',
    'hsl(280, 65%, 60%)',
    'hsl(0, 72%, 55%)',
];

function rowsFromData(data: unknown): Row[] {
    if (Array.isArray(data)) {
        return data as Row[];
    }
    if (data && typeof data === 'object' && Array.isArray((data as { rows?: unknown }).rows)) {
        return (data as { rows: Row[] }).rows;
    }
    return [];
}

function pickSeriesKeys(sample: Row | undefined): { xKey: string; yKey: string } | null {
    if (!sample) {
        return null;
    }
    const keys = Object.keys(sample);
    const preferredX = ['date', 'day', 'name', 'label', 'bucket', 'category', 'state', 'source'];
    const xKey =
        preferredX.map((p) => keys.find((k) => k === p)).find(Boolean) ??
        keys.find((k) => typeof sample[k] === 'string') ??
        keys[0];
    if (!xKey) {
        return null;
    }
    const yKey =
        keys.find((k) => k !== xKey && typeof sample[k] === 'number') ??
        keys.find((k) => k !== xKey && typeof sample[k] !== 'object' && !Number.isNaN(Number(sample[k])));
    if (!yKey) {
        return null;
    }
    return { xKey, yKey };
}

type ChartConfig = Record<string, unknown>;

export function MetricLineChart({ data, config }: { data: unknown; config: ChartConfig }) {
    const rows = rowsFromData(data);
    const keys = pickSeriesKeys(rows[0]);
    const stroke = typeof config.color === 'string' ? config.color : 'var(--primary)';
    const showGrid = config.showGrid !== false;

    if (!keys) {
        return (
            <div className="flex h-[220px] items-center justify-center rounded-md border border-border bg-card text-xs text-muted-foreground">
                No chart series could be inferred for this metric.
            </div>
        );
    }

    const { xKey, yKey } = keys;

    return (
        <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    {showGrid ? <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /> : null}
                    <XAxis dataKey={xKey} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={40} />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            fontSize: 12,
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey={yKey}
                        stroke={stroke}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function MetricBarChart({ data, config }: { data: unknown; config: ChartConfig }) {
    const rows = rowsFromData(data);
    const keys = pickSeriesKeys(rows[0]);
    const fill = typeof config.color === 'string' ? config.color : 'var(--primary)';
    const showGrid = config.showGrid !== false;

    if (!keys) {
        return (
            <div className="flex h-[220px] items-center justify-center rounded-md border border-border bg-card text-xs text-muted-foreground">
                No chart series could be inferred for this metric.
            </div>
        );
    }

    const { xKey, yKey } = keys;

    return (
        <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    {showGrid ? <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /> : null}
                    <XAxis dataKey={xKey} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={40} />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            fontSize: 12,
                        }}
                    />
                    <Bar dataKey={yKey} fill={fill} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function MetricPieChart({ data, config }: { data: unknown; config: ChartConfig }) {
    const rows = rowsFromData(data);
    const keys = pickSeriesKeys(rows[0]);
    const nameKey = keys?.xKey ?? 'name';
    const valueKey = keys?.yKey ?? 'value';
    const colors =
        Array.isArray(config.colors) && config.colors.every((c) => typeof c === 'string')
            ? (config.colors as string[])
            : DEFAULT_COLORS;

    if (rows.length === 0) {
        return (
            <div className="flex h-[220px] items-center justify-center rounded-md border border-border bg-card text-xs text-muted-foreground">
                No rows available for pie chart.
            </div>
        );
    }

    return (
        <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={rows}
                        dataKey={valueKey}
                        nameKey={nameKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={72}
                        isAnimationActive={false}
                    >
                        {rows.map((_, i) => (
                            <Cell key={i} fill={colors[i % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            fontSize: 12,
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
