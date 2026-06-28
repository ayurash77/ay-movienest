import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { Bookmark, Check, Film, MessageSquare, Settings, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRuDate } from '@/lib/date-format';
import { getMyProfile } from '@/server/profile';

export const Route = createFileRoute('/profile')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({ to: '/sign-in', search: { redirectTo: '/profile' } });
        }
    },
    loader: async () => {
        const profile = await getMyProfile();
        if (!profile) throw redirect({ to: '/sign-in', search: { redirectTo: '/profile' } });
        return profile;
    },
    component: ProfilePage,
});

function initials(name: string) {
    const words = name.trim().split(/\s+/);
    return ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <span className="text-primary [&_svg]:size-5">{icon}</span>
            <span>
                <span className="block text-xl font-bold leading-tight">{value}</span>
                <span className="block text-xs text-muted-foreground">{label}</span>
            </span>
        </div>
    );
}

function ProfilePage() {
    const profile = Route.useLoaderData();
    const joined = formatRuDate(profile.createdAt);

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <Card>
                <CardHeader className="flex-row items-center gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        {initials(profile.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-xl">{profile.name}</CardTitle>
                        <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
                        <p className="text-xs text-muted-foreground">На сайте с {joined}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link to="/settings">
                            <Settings/>
                            Настройки
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <StatTile icon={<Film/>} value={profile.moviesAdded} label="Фильмов добавлено"/>
                        <StatTile icon={<Star/>} value={profile.ratingsCount} label="Оценок"/>
                        <StatTile icon={<MessageSquare/>} value={profile.commentsCount} label="Комментариев"/>
                        <StatTile icon={<Bookmark/>} value={profile.watchlistCount} label="К просмотру"/>
                        <StatTile icon={<Check/>} value={profile.watchedCount} label="Просмотрено"/>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
