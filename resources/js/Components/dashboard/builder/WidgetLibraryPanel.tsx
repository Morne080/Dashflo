import { widgetLibraryIcon } from '@/Components/dashboard/builder/widgetLibraryIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { AvailableWidgetDefinition } from '@/types/catalog';
import { useMemo, useState } from 'react';

const CATEGORY_HEADINGS: Record<string, string> = {
    scorecard: 'Scorecards',
    chart: 'Charts',
    table: 'Tables',
};

type WidgetLibraryPanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    definitions?: AvailableWidgetDefinition[];
    onSelectType: (definition: AvailableWidgetDefinition) => void;
};

export function WidgetLibraryPanel({ open, onOpenChange, definitions, onSelectType }: WidgetLibraryPanelProps) {
    const [query, setQuery] = useState('');

    const items = useMemo(() => {
        const list = definitions ?? [];
        const q = query.trim().toLowerCase();
        if (!q) {
            return list;
        }
        return list.filter(
            (d) => d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
        );
    }, [definitions, query]);

    const grouped = useMemo(() => {
        const order = ['scorecard', 'chart', 'table'];
        const map = new Map<string, AvailableWidgetDefinition[]>();
        for (const w of items) {
            const cat = w.category || 'other';
            const arr = map.get(cat) ?? [];
            arr.push(w);
            map.set(cat, arr);
        }
        const keys = [...new Set([...order, ...map.keys()])];
        return keys
            .filter((k) => map.has(k))
            .map((category) => ({
                category,
                title: CATEGORY_HEADINGS[category] ?? category.charAt(0).toUpperCase() + category.slice(1),
                widgets: map.get(category) ?? [],
            }));
    }, [items]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md">
                <SheetHeader className="space-y-1 pr-8 text-left">
                    <SheetTitle>Add widget</SheetTitle>
                    <SheetDescription>Choose a widget type to place on your dashboard.</SheetDescription>
                </SheetHeader>

                <div className="mt-4 shrink-0 px-1">
                    <Input
                        type="search"
                        placeholder="Search widgets…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="h-9 text-sm"
                        aria-label="Filter widget library"
                    />
                </div>

                <div className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto px-1 pb-6">
                    {grouped.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No widgets match your search.</p>
                    ) : (
                        grouped.map((group) => (
                            <section key={group.category} className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                                    {group.title}
                                </h3>
                                <ul className="grid gap-2">
                                    {group.widgets.map((def) => {
                                        const Icon = widgetLibraryIcon(def.icon);
                                        return (
                                            <li key={def.key}>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className={cn(
                                                        'h-auto w-full justify-start gap-3 border-border p-3 text-left transition-colors',
                                                        'hover:border-primary/50 hover:bg-primary/10',
                                                    )}
                                                    onClick={() => {
                                                        onSelectType(def);
                                                        onOpenChange(false);
                                                        setQuery('');
                                                    }}
                                                >
                                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                                                        <Icon className="size-4 text-primary" aria-hidden="true" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-medium text-foreground">
                                                            {def.label}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                                                            {def.description}
                                                        </span>
                                                    </span>
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
