import { useEffect, useState } from 'react';
import { createRootRoute, HeadContent, Link, Outlet, Scripts, useLocation } from '@tanstack/react-router';
import { Clapperboard, Menu } from 'lucide-react';
import { Toaster } from 'sonner';

import appCss from '../styles.css?url';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { getSessionUser } from '@/server/auth';

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: 'MovieNest — библиотека фильмов' },
        ],
        links: [
            { rel: 'stylesheet', href: appCss },
        ],
    }),
    beforeLoad: async () => {
        const user = await getSessionUser();
        return { user };
    },
    shellComponent: RootDocument,
    component: RootComponent,
});

function RootComponent() {
    const { user } = Route.useRouteContext();
    const { pathname } = useLocation();
    const [ isMobileMenuOpen, setIsMobileMenuOpen ] = useState(false);

    // Закрываем мобильное меню при переходе на другую страницу
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [ pathname ]);

    return (
        <div className="flex min-h-svh">
            <aside className="sticky top-0 hidden h-svh w-60 shrink-0 border-r border-border bg-card/30 md:block">
                <Sidebar user={user}/>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md md:hidden">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Открыть меню">
                                <Menu/>
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <Sidebar user={user}/>
                        </SheetContent>
                    </Sheet>
                    <Link to="/" className="flex items-center gap-2 text-base font-bold tracking-tight">
                        <Clapperboard className="size-5 text-primary"/>
                        Movie<span className="text-primary">Nest</span>
                    </Link>
                </header>

                <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
                    <Outlet/>
                </main>
                <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
                    MovieNest — ваша библиотека фильмов
                </footer>
            </div>
            <Toaster theme="dark" position="bottom-right"/>
        </div>
    );
}

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru" className="dark">
            <head>
                <HeadContent/>
            </head>
            <body>
                {children}
                <Scripts/>
            </body>
        </html>
    );
}
