import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import {
    Bookmark,
    Clapperboard,
    Film,
    Home,
    LogOut,
    Plus,
    Search,
    Settings,
    UserRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { signOut, type SessionUser } from '@/server/auth';

function initials(name: string) {
    const words = name.trim().split(/\s+/);
    const first = words[0]?.[0] ?? '?';
    const second = words[1]?.[0] ?? '';
    return (first + second).toUpperCase();
}

const navLinkClass =
    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0';
const navLinkActive = 'bg-accent text-foreground font-medium';

export function Sidebar({ user }: { user: SessionUser | null }) {
    const router = useRouter();
    const navigate = useNavigate();
    const { pathname, searchStr } = useLocation();
    const urlQuery = pathname === '/movies'
        ? new URLSearchParams(searchStr).get('q') ?? ''
        : '';
    const [ query, setQuery ] = useState(urlQuery);

    // Дебаунс: поиск из сайдбара ведёт в каталог с query в URL
    useEffect(() => {
        const handle = setTimeout(() => {
            const trimmed = query.trim();
            if (trimmed === urlQuery) return;
            if (!trimmed && pathname !== '/movies') return;
            navigate({
                to: '/movies',
                search: trimmed ? { q: trimmed } : {},
                replace: pathname === '/movies',
            });
        }, 300);
        return () => clearTimeout(handle);
    }, [ query, urlQuery, pathname, navigate ]);

    const handleSignOut = async () => {
        await signOut();
        await router.invalidate();
        navigate({ to: '/' });
    };

    return (
        <div className="flex h-full flex-col gap-4 p-4">
            <Link to="/" className="flex items-center gap-2 px-1 text-lg font-bold tracking-tight">
                <Clapperboard className="size-6 text-primary"/>
                Movie<span className="text-primary">Nest</span>
            </Link>

            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск фильмов…"
                    className="pl-8"
                    aria-label="Поиск фильмов"
                />
            </div>

            <nav className="flex flex-col gap-1">
                <Link
                    to="/"
                    className={navLinkClass}
                    activeProps={{ className: cn(navLinkClass, navLinkActive) }}
                    activeOptions={{ exact: true }}
                >
                    <Home/>
                    Дашборд
                </Link>
                <Link
                    to="/movies"
                    className={navLinkClass}
                    activeProps={{ className: cn(navLinkClass, navLinkActive) }}
                    activeOptions={{ exact: true }}
                >
                    <Film/>
                    Все фильмы
                </Link>
                {user ? (
                    <Link
                        to="/my"
                        className={navLinkClass}
                        activeProps={{ className: cn(navLinkClass, navLinkActive) }}
                    >
                        <Bookmark/>
                        Мои списки
                    </Link>
                ) : null}
            </nav>

            {user ? (
                <Button asChild size="sm" className="justify-start">
                    <Link to="/movies/new">
                        <Plus/>
                        Добавить фильм
                    </Link>
                </Button>
            ) : null}

            <div className="mt-auto flex flex-col gap-1">
                {user ? (
                    <>
                        <Link
                            to="/settings"
                            className={navLinkClass}
                            activeProps={{ className: cn(navLinkClass, navLinkActive) }}
                        >
                            <Settings/>
                            Настройки
                        </Link>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                        {initials(user.name)}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium">{user.name}</span>
                                        <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                                    </span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="start" className="w-56">
                                <DropdownMenuItem onSelect={() => navigate({ to: '/profile' })}>
                                    <UserRound/>
                                    Открыть профиль
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem
                                    onSelect={handleSignOut}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <LogOut/>
                                    Выйти
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                ) : (
                    <div className="flex flex-col gap-2">
                        <Button asChild size="sm">
                            <Link to="/sign-in">Войти</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link to="/sign-up">Регистрация</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
