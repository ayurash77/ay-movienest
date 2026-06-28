import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;

function SheetContent({
    className,
    children,
    title = 'Меню',
    onOpenAutoFocus,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title?: string }) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
                className="fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            />
            <DialogPrimitive.Content
                tabIndex={-1}
                onOpenAutoFocus={(event) => {
                    onOpenAutoFocus?.(event);
                    if (event.defaultPrevented) return;
                    event.preventDefault();
                    const target = event.currentTarget;
                    window.requestAnimationFrame(() => {
                        if (target instanceof HTMLElement) {
                            target.focus({ preventScroll: true });
                        }
                    });
                }}
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background shadow-xl outline-none',
                    'data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
                    className,
                )}
                {...props}
            >
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                {children}
                <DialogPrimitive.Close
                    className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Закрыть меню"
                >
                    <X className="size-4"/>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

export { Sheet, SheetTrigger, SheetContent };
