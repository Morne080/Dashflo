import {
    BarChart3,
    Gauge,
    LayoutGrid,
    LineChart,
    PieChart,
    Table,
    type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
    Gauge,
    LineChart,
    BarChart3,
    PieChart,
    Table,
    LayoutGrid,
};

export function widgetLibraryIcon(name: string): LucideIcon {
    return ICONS[name] ?? LayoutGrid;
}
