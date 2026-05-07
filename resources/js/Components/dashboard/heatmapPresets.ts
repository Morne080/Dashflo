import type { HeatmapConfig } from '@/Components/dashboard/tableTypes';

export const convRateHeatmap: HeatmapConfig = {
    column: 'conv_rate',
    thresholds: [
        { min: 0, max: 5, bg: 'bg-indigo-950/60' },
        { min: 5, max: 15, bg: 'bg-yellow-950/50' },
        { min: 15, max: 100, bg: 'bg-green-950/60' },
    ],
};

export const gpMarginHeatmap: HeatmapConfig = {
    column: 'gp_margin',
    thresholds: [
        { min: 0, max: 10, bg: 'bg-indigo-950/60' },
        { min: 10, max: 30, bg: 'bg-yellow-950/50' },
        { min: 30, max: 100, bg: 'bg-green-950/60' },
    ],
};

export const performanceHeatmaps: HeatmapConfig[] = [
    convRateHeatmap,
    gpMarginHeatmap,
];

export const convRateHeatmaps: HeatmapConfig[] = [convRateHeatmap];
