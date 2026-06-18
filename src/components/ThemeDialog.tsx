import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, Palette, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { appThemes, applyTheme, getStoredTheme, storeTheme, type AppTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

type ThemeDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const themePreview: Record<AppTheme, { bg: string; fg: string; accent: string; note: string }> = {
    'golden-show': {
        bg: 'oklch(0.16 0.02 270)',
        fg: 'oklch(0.95 0.01 270)',
        accent: 'oklch(0.75 0.16 70)',
        note: 'Текущая палитра MovieNest',
    },
    catppuccin: {
        bg: '#1e1e2e',
        fg: '#cdd6f4',
        accent: '#cba6f7',
        note: 'Mocha palette',
    },
    onedark: {
        bg: '#16191d',
        fg: '#abb2bf',
        accent: '#61afef',
        note: 'One Dark Pro Night Flat',
    },
    dracula: {
        bg: '#282a36',
        fg: '#f8f8f2',
        accent: '#bd93f9',
        note: 'Официальная палитра Dracula',
    },
    ayu: {
        bg: '#10141c',
        fg: '#bfbdb6',
        accent: '#e6b450',
        note: 'Ayu Dark Bordered',
    },
    shotmate: {
        bg: 'oklch(0.245 0.014 268)',
        fg: 'oklch(0.9 0.03 270)',
        accent: 'oklch(0.7 0.5 255)',
        note: 'Палитра проекта shotmate',
    },
};

export function ThemeDialog({ open, onOpenChange }: ThemeDialogProps) {
    const [ theme, setTheme ] = useState<AppTheme>(() => getStoredTheme());

    useEffect(() => {
        if (open) setTheme(getStoredTheme());
    }, [ open ]);

    const selectTheme = (nextTheme: AppTheme) => {
        setTheme(nextTheme);
        storeTheme(nextTheme);
        applyTheme(nextTheme);
        onOpenChange(false);
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"/>
                <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-[0_22px_64px_rgba(0,0,0,0.52)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold">
                                <Palette className="size-4 text-primary"/>
                                Оформление
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                                Тема приложения
                            </DialogPrimitive.Description>
                        </div>
                        <DialogPrimitive.Close asChild>
                            <Button variant="ghost" size="icon" aria-label="Закрыть">
                                <X className="size-4"/>
                            </Button>
                        </DialogPrimitive.Close>
                    </div>

                    <div className="mt-5 grid gap-2">
                        {appThemes.map((item) => {
                            const active = item.id === theme;
                            const preview = themePreview[item.id];
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => selectTheme(item.id)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-md border border-border bg-card/60 p-3 text-left transition-colors hover:bg-accent',
                                        active && 'border-primary bg-accent text-accent-foreground',
                                    )}
                                >
                                    <span
                                        className="grid size-9 shrink-0 grid-cols-2 overflow-hidden rounded-md border border-border"
                                        style={{ background: preview.bg }}
                                    >
                                        <span style={{ background: preview.bg }}/>
                                        <span style={{ background: preview.accent }}/>
                                        <span style={{ background: preview.fg }}/>
                                        <span style={{ background: preview.bg }}/>
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium">{item.label}</span>
                                        <span className="block text-xs text-muted-foreground">{preview.note}</span>
                                    </span>
                                    {active ? <Check className="size-4 text-primary"/> : null}
                                </button>
                            );
                        })}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
