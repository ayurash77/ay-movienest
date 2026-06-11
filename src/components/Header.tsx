import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { Clapperboard, LogOut, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { signOut, type SessionUser } from '@/server/auth';

export function Header({ user }: { user: SessionUser | null }) {
    const router = useRouter();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        await router.invalidate();
        navigate({ to: '/' });
    };

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
                <div className="flex items-center gap-5">
                    <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
                        <Clapperboard className="size-6 text-primary"/>
                        Movie<span className="text-primary">Nest</span>
                    </Link>
                    <Link
                        to="/movies"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        activeProps={{ className: 'text-foreground font-medium' }}
                        activeOptions={{ exact: true }}
                    >
                        Все фильмы
                    </Link>
                    {user ? (
                        <Link
                            to="/my"
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                            activeProps={{ className: 'text-foreground font-medium' }}
                        >
                            Мои списки
                        </Link>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    {user ? (
                        <>
                            <Button asChild size="sm">
                                <Link to="/movies/new">
                                    <Plus/>
                                    Добавить фильм
                                </Link>
                            </Button>
                            <span className="hidden text-sm text-muted-foreground sm:inline">
                                {user.name}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSignOut}
                                aria-label="Выйти"
                            >
                                <LogOut/>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button asChild variant="ghost" size="sm">
                                <Link to="/sign-in">Войти</Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link to="/sign-up">Регистрация</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
