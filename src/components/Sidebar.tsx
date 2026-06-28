import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import {
    Bell,
    Bookmark,
    Check,
    MessageCircle,
    LayoutDashboard,
    Film,
    Home,
    LogOut,
    Palette,
    Plus,
    Search,
    Settings,
    UserRound,
    Users,
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
import { getUnreadChatCount } from '@/server/chat';
import { getUnreadNotificationCount } from '@/server/notifications';

function initials(name: string) {
    const words = name.trim().split(/\s+/);
    const first = words[0]?.[0] ?? '?';
    const second = words[1]?.[0] ?? '';
    return (first + second).toUpperCase();
}

const navLinkClass =
    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0';
const navLinkActive = 'bg-accent text-foreground font-medium';

function NavCount({ value }: { value: number }) {
    if (value <= 0) return null;
    return (
        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground">
            {value}
        </span>
    );
}

export function Sidebar({ user, onOpenTheme }: { user: SessionUser | null; onOpenTheme?: () => void }) {
    const router = useRouter();
    const navigate = useNavigate();
    const { pathname, searchStr } = useLocation();
    const searchParams = new URLSearchParams(searchStr);
    const urlQuery = pathname === '/movies'
        ? searchParams.get('q') ?? ''
        : '';
    const urlKind = pathname === '/movies'
        ? searchParams.get('kind') ?? ''
        : '';
    const dashboardTab = pathname === '/dashboard'
        ? searchParams.get('tab') ?? ''
        : '';
    const [ query, setQuery ] = useState(urlQuery);
    const [ unreadNotifications, setUnreadNotifications ] = useState(0);
    const [ unreadChats, setUnreadChats ] = useState(0);

    // Дебаунс: поиск из сайдбара ведёт в каталог с query в URL
    useEffect(() => {
        const handle = setTimeout(() => {
            const trimmed = query.trim();
            if (trimmed === urlQuery) return;
            if (!trimmed && pathname !== '/movies') return;
            navigate({
                to: '/movies',
                search: {
                    ...(trimmed ? { q: trimmed } : {}),
                    ...(urlKind ? { kind: urlKind as 'MOVIE' | 'SERIES' | 'CARTOON' } : {}),
                },
                replace: pathname === '/movies',
            });
        }, 300);
        return () => clearTimeout(handle);
    }, [ query, urlQuery, pathname, navigate ]);

    useEffect(() => {
        if (!user) {
            setUnreadNotifications(0);
            setUnreadChats(0);
            return;
        }

        let cancelled = false;
        const refresh = async () => {
            const [ notificationCount, chatCount ] = await Promise.all([
                getUnreadNotificationCount(),
                getUnreadChatCount(),
            ]);
            if (!cancelled) {
                setUnreadNotifications(notificationCount);
                setUnreadChats(chatCount);
            }
        };
        const handleChanged = () => {
            void refresh();
        };

        void refresh();
        const timer = window.setInterval(refresh, 12000);
        window.addEventListener('movienest:notifications-changed', handleChanged);
        window.addEventListener('movienest:chat-changed', handleChanged);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
            window.removeEventListener('movienest:notifications-changed', handleChanged);
            window.removeEventListener('movienest:chat-changed', handleChanged);
        };
    }, [ user, pathname ]);

    const handleSignOut = async () => {
        await signOut();
        await router.invalidate();
        navigate({ to: '/' });
    };

    return (
        <div className="flex h-full flex-col gap-4 p-4">
            <Link to="/" className="flex items-center gap-2 px-1 text-lg font-bold tracking-tight">
                <Film className="size-6 text-primary"/>
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
                    Фильмотека
                </Link>
                <Link
                    to="/movies"
                    search={{ kind: 'MOVIE' }}
                    className={cn(navLinkClass, pathname === '/movies' && urlKind === 'MOVIE' && navLinkActive)}
                >
                    <Film/>
                    Фильмы
                </Link>
                <Link
                    to="/movies"
                    search={{ kind: 'SERIES' }}
                    className={cn(navLinkClass, pathname === '/movies' && urlKind === 'SERIES' && navLinkActive)}
                >
                    <Film/>
                    Сериалы
                </Link>
                <Link
                    to="/movies"
                    search={{ kind: 'CARTOON' }}
                    className={cn(navLinkClass, pathname === '/movies' && urlKind === 'CARTOON' && navLinkActive)}
                >
                    <Film/>
                    Мультфильмы
                </Link>
                {user ? (
                    <Link
                        to="/dashboard"
                        className={cn(navLinkClass, pathname === '/dashboard' && (!dashboardTab || dashboardTab === 'movies') && navLinkActive)}
                    >
                        <LayoutDashboard/>
                        Дашборд
                    </Link>
                ) : null}
                {user ? (
                    <Link
                        to="/dashboard"
                        search={{ tab: 'friends' }}
                        className={cn(navLinkClass, pathname === '/dashboard' && dashboardTab === 'friends' && navLinkActive)}
                    >
                        <Users/>
                        Друзья
                    </Link>
                ) : null}
                {user ? (
                    <Link
                        to="/chat"
                        className={navLinkClass}
                        activeProps={{ className: cn(navLinkClass, navLinkActive) }}
                    >
                        <MessageCircle/>
                        <span className="min-w-0 flex-1 truncate">Чат</span>
                        <NavCount value={unreadChats}/>
                    </Link>
                ) : null}
                {user ? (
                    <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                        <div className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Мои списки
                        </div>
                        <Link
                            to="/my"
                            className={cn(navLinkClass, pathname === '/my' && navLinkActive)}
                        >
                            <Bookmark/>
                            К просмотру
                        </Link>
                        <Link
                            to="/my"
                            className={navLinkClass}
                        >
                            <Check/>
                            Просмотрено
                        </Link>
                    </div>
                ) : null}
            </nav>

            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" className="justify-start">
                            <Plus/>
                            Добавить
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onSelect={() => navigate({ to: '/movies/new', search: { kind: 'MOVIE' } })}>
                            <Film/>
                            Фильм
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate({ to: '/movies/new', search: { kind: 'SERIES' } })}>
                            <Film/>
                            Сериал
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate({ to: '/movies/new', search: { kind: 'CARTOON' } })}>
                            <Film/>
                            Мультфильм
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}

            <div className="mt-auto flex flex-col gap-1">
                {user ? (
                    <Link
                        to="/notifications"
                        className={navLinkClass}
                        activeProps={{ className: cn(navLinkClass, navLinkActive) }}
                    >
                        <Bell/>
                        <span className="min-w-0 flex-1 truncate">Уведомления</span>
                        <NavCount value={unreadNotifications}/>
                    </Link>
                ) : null}
                <button
                    type="button"
                    onClick={onOpenTheme}
                    className={cn(navLinkClass, 'w-full text-left')}
                >
                    <Palette/>
                    Оформление
                </button>
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
