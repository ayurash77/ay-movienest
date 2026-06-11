import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import appCss from '../styles.css?url';
import { Header } from '@/components/Header';
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

    return (
        <div className="flex min-h-svh flex-col">
            <Header user={user}/>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
                <Outlet/>
            </main>
            <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
                MovieNest — ваша библиотека фильмов
            </footer>
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
