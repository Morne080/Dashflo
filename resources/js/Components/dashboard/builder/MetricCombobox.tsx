import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AvailableMetricDefinition } from '@/types/catalog';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

type MetricComboboxProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPath<T>;
    metrics: AvailableMetricDefinition[];
    disabled?: boolean;
    /** When false, omit the field label (use an outer section heading instead). */
    showLabel?: boolean;
};

export function MetricCombobox<T extends FieldValues>({
    control,
    name,
    metrics,
    disabled,
    showLabel = true,
}: MetricComboboxProps<T>) {
    const [open, setOpen] = useState(false);

    const grouped = useMemo(() => {
        const map = new Map<string, AvailableMetricDefinition[]>();
        for (const m of metrics) {
            const cat = m.category || 'other';
            const arr = map.get(cat) ?? [];
            arr.push(m);
            map.set(cat, arr);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [metrics]);

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const selected = metrics.find((m) => m.key === field.value);
                return (
                    <FormItem className="flex flex-col gap-2">
                        {showLabel ? <FormLabel className="text-sm font-medium text-foreground">Metric</FormLabel> : null}
                        <Popover open={open} onOpenChange={setOpen}>
                            <FormControl>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        disabled={disabled}
                                        className={cn(
                                            'h-auto min-h-11 justify-between gap-2 py-2 text-left font-normal',
                                            !field.value && 'text-muted-foreground',
                                        )}
                                    >
                                        <span className="min-w-0 flex-1">
                                            {selected ? (
                                                <span className="flex flex-col items-start gap-0.5">
                                                    <span className="w-full truncate font-semibold text-foreground">
                                                        {selected.label}
                                                    </span>
                                                    <span className="line-clamp-2 w-full text-xs font-normal leading-snug text-muted-foreground">
                                                        {selected.description}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="block py-0.5">Select a metric…</span>
                                            )}
                                        </span>
                                        <ChevronsUpDown className="size-4 shrink-0 self-center opacity-60" />
                                    </Button>
                                </PopoverTrigger>
                            </FormControl>
                            <PopoverContent className="w-[min(100vw-2rem,28rem)] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search metrics…" />
                                    <CommandList>
                                        <CommandEmpty>No metric found.</CommandEmpty>
                                        {grouped.map(([category, items]) => (
                                            <CommandGroup
                                                key={category}
                                                heading={category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                            >
                                                {items.map((m) => (
                                                    <CommandItem
                                                        key={m.key}
                                                        value={`${m.label} ${m.description} ${m.key}`}
                                                        onSelect={() => {
                                                            field.onChange(m.key);
                                                            setOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 size-4 shrink-0',
                                                                field.value === m.key ? 'opacity-100' : 'opacity-0',
                                                            )}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-sm font-medium">{m.label}</div>
                                                            <div className="truncate text-xs text-muted-foreground">
                                                                {m.description}
                                                            </div>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
}
