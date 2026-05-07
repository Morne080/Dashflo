export type HeatmapThreshold = {
    min: number;
    max: number;
    bg: string;
};

export type HeatmapConfig = {
    column: string;
    thresholds: HeatmapThreshold[];
};
