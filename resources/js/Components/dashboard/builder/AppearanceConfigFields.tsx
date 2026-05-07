import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { WidgetConfigSchemaField } from '@/types/catalog';
import type { Control, FieldValues, Path } from 'react-hook-form';

type AppearanceConfigFieldsProps<T extends FieldValues> = {
    control: Control<T>;
    schema: WidgetConfigSchemaField[];
};

function normalizeFieldType(type: string): 'select' | 'boolean' | 'number' | 'color' | 'text' {
    if (type === 'string') {
        return 'text';
    }
    if (type === 'select' || type === 'boolean' || type === 'number' || type === 'color' || type === 'text') {
        return type;
    }

    return 'text';
}

export function AppearanceConfigFields<T extends FieldValues>({
    control,
    schema,
}: AppearanceConfigFieldsProps<T>) {
    return (
        <div className="space-y-5 pr-1">
            {schema.map((field) => {
                const t = normalizeFieldType(field.type);
                const name = `config_json.${field.name}` as Path<T>;

                return (
                    <FormField
                        key={field.name}
                        control={control}
                        name={name}
                        render={({ field: f }) => (
                            <FormItem>
                                <div className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border p-3">
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <FormLabel className="text-sm font-medium">{field.label}</FormLabel>
                                        {field.help ? (
                                            <FormDescription className="text-xs">{field.help}</FormDescription>
                                        ) : null}
                                    </div>
                                    <div className="shrink-0">
                                        {t === 'boolean' ? (
                                            <FormControl>
                                                <Switch
                                                    checked={Boolean(f.value)}
                                                    onCheckedChange={f.onChange}
                                                    aria-label={field.label}
                                                />
                                            </FormControl>
                                        ) : null}
                                        {t === 'color' ? (
                                            <FormControl>
                                                <input
                                                    type="color"
                                                    className="h-9 w-14 cursor-pointer rounded border border-input bg-background"
                                                    value={
                                                        typeof f.value === 'string' && f.value.startsWith('#')
                                                            ? f.value
                                                            : '#000000'
                                                    }
                                                    onChange={(e) => f.onChange(e.target.value)}
                                                    aria-label={field.label}
                                                />
                                            </FormControl>
                                        ) : null}
                                        {t === 'number' ? (
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    className="h-9 w-[120px]"
                                                    value={f.value === undefined || f.value === null ? '' : String(f.value)}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        f.onChange(raw === '' ? undefined : Number(raw));
                                                    }}
                                                    aria-label={field.label}
                                                />
                                            </FormControl>
                                        ) : null}
                                        {t === 'text' ? (
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    className="h-9 w-[200px]"
                                                    value={f.value === undefined || f.value === null ? '' : String(f.value)}
                                                    onChange={(e) => f.onChange(e.target.value)}
                                                    aria-label={field.label}
                                                />
                                            </FormControl>
                                        ) : null}
                                        {t === 'select' ? (
                                            <FormControl>
                                                <Select
                                                    value={
                                                        f.value === undefined || f.value === null
                                                            ? ''
                                                            : String(f.value)
                                                    }
                                                    onValueChange={f.onChange}
                                                >
                                                    <SelectTrigger className="h-9 w-[180px]">
                                                        <SelectValue placeholder="Choose…" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(field.options ?? []).map((opt) => (
                                                            <SelectItem key={String(opt)} value={String(opt)}>
                                                                {String(opt)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        ) : null}
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );
            })}
        </div>
    );
}
