import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { DashboardListItem } from '@/types/dashboard';
import type { DashboardsIndexPageProps } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { LayoutGrid, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

function formatUpdatedAt(iso: string): string {
    try {
        return format(parseISO(iso), 'MMM d, yyyy');
    } catch {
        return iso;
    }
}

function DashboardCardMenu({
    dashboard,
    canDelete,
}: {
    dashboard: DashboardListItem;
    canDelete: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const renameForm = useForm({ name: dashboard.name, description: dashboard.description ?? '' });

    const closeAll = () => {
        setOpen(false);
        setRenameOpen(false);
    };

    const submitRename: FormEventHandler = (e) => {
        e.preventDefault();
        renameForm.patch(route('dashboards.update', dashboard.id), {
            preserveScroll: true,
            onSuccess: () => {
                renameForm.reset();
                closeAll();
            },
        });
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Actions for ${dashboard.name}`}
                    >
                        <MoreHorizontal className="size-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                            setOpen(false);
                            renameForm.setData({
                                name: dashboard.name,
                                description: dashboard.description ?? '',
                            });
                            setRenameOpen(true);
                        }}
                    >
                        <Pencil className="size-4 opacity-70" aria-hidden />
                        Rename
                    </button>
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                            setOpen(false);
                            router.post(
                                route('dashboards.duplicate', dashboard.id),
                                {},
                                { preserveScroll: true },
                            );
                        }}
                    >
                        <LayoutGrid className="size-4 opacity-70" aria-hidden />
                        Duplicate
                    </button>
                    {!dashboard.is_default ? (
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                                setOpen(false);
                                router.post(
                                    route('dashboards.set-default', dashboard.id),
                                    {},
                                    { preserveScroll: true },
                                );
                            }}
                        >
                            Set as default
                        </button>
                    ) : null}
                    <button
                        type="button"
                        disabled={!canDelete}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-40"
                        onClick={() => {
                            if (
                                !canDelete ||
                                !window.confirm(
                                    `Delete dashboard “${dashboard.name}”? This cannot be undone.`,
                                )
                            ) {
                                return;
                            }
                            setOpen(false);
                            router.delete(route('dashboards.destroy', dashboard.id), {
                                preserveScroll: true,
                            });
                        }}
                    >
                        <Trash2 className="size-4 opacity-70" aria-hidden />
                        Delete
                    </button>
                </PopoverContent>
            </Popover>

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={submitRename}>
                        <DialogHeader>
                            <DialogTitle>Rename dashboard</DialogTitle>
                            <DialogDescription>Update the name and description shown on your dashboard list.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor={`rename-name-${dashboard.id}`}>Name</Label>
                                <Input
                                    id={`rename-name-${dashboard.id}`}
                                    value={renameForm.data.name}
                                    onChange={(e) => renameForm.setData('name', e.target.value)}
                                    required
                                />
                                {renameForm.errors.name ? (
                                    <p className="text-xs text-destructive">{renameForm.errors.name}</p>
                                ) : null}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`rename-desc-${dashboard.id}`}>Description</Label>
                                <textarea
                                    id={`rename-desc-${dashboard.id}`}
                                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                    value={renameForm.data.description}
                                    onChange={(e) => renameForm.setData('description', e.target.value)}
                                    rows={3}
                                />
                                {renameForm.errors.description ? (
                                    <p className="text-xs text-destructive">{renameForm.errors.description}</p>
                                ) : null}
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                disabled={renameForm.processing}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function DashboardsIndex() {
    const { dashboards } = usePage<DashboardsIndexPageProps>().props;
    const [createOpen, setCreateOpen] = useState(false);
    const createForm = useForm({ name: '', description: '' });

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(route('dashboards.store'), {
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const canDeleteAny = dashboards.length > 1;

    return (
        <AuthenticatedLayout>
            <Head title="Dashboards" />

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your dashboards</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Open a dashboard to edit widgets, or manage them here.
                        </p>
                    </div>
                    <Button
                        type="button"
                        className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus className="me-2 size-4" aria-hidden />
                        New dashboard
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {dashboards.map((d) => (
                        <div
                            key={d.id}
                            className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                        >
                            <Link
                                href={route('dashboards.show', d.id)}
                                className="block p-5 pr-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <h2 className="text-base font-semibold text-foreground">{d.name}</h2>
                                    {d.is_default ? (
                                        <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                                            Default
                                        </span>
                                    ) : null}
                                </div>
                                {d.description ? (
                                    <p className="line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
                                ) : (
                                    <p className="text-sm italic text-muted-foreground">No description</p>
                                )}
                                <p className="mt-4 text-xs text-muted-foreground">
                                    Updated {formatUpdatedAt(d.updated_at)}
                                </p>
                            </Link>
                            <div className="absolute right-1 top-1">
                                <DashboardCardMenu dashboard={d} canDelete={canDeleteAny} />
                            </div>
                        </div>
                    ))}
                </div>

                {dashboards.length === 0 ? (
                    <p className="mt-8 text-center text-sm text-muted-foreground">No dashboards yet.</p>
                ) : null}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={submitCreate}>
                        <DialogHeader>
                            <DialogTitle>New dashboard</DialogTitle>
                            <DialogDescription>
                                Creates an empty canvas. Add widgets after you open it.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="create-name">Name</Label>
                                <Input
                                    id="create-name"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    placeholder="e.g. Executive overview"
                                    required
                                    autoFocus
                                />
                                {createForm.errors.name ? (
                                    <p className="text-xs text-destructive">{createForm.errors.name}</p>
                                ) : null}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-desc">Description (optional)</Label>
                                <textarea
                                    id="create-desc"
                                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                    value={createForm.data.description}
                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                    placeholder="Short note for your list"
                                    rows={3}
                                />
                                {createForm.errors.description ? (
                                    <p className="text-xs text-destructive">{createForm.errors.description}</p>
                                ) : null}
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                disabled={createForm.processing}
                            >
                                Create
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
