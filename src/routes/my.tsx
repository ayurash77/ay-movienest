import { createFileRoute, redirect } from '@tanstack/react-router';
import { Bookmark, Check } from 'lucide-react';

import { MovieSection } from '@/components/movies/MovieSection';
import { getMyLists } from '@/server/movies';

export const Route = createFileRoute('/my')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({ to: '/sign-in', search: { redirectTo: '/my' } });
        }
    },
    loader: async () => {
        const lists = await getMyLists();
        return lists ?? { watchlist: [], watched: [] };
    },
    component: MyListsPage,
});

function MyListsPage() {
    const { watchlist, watched } = Route.useLoaderData();

    return (
        <div className="flex flex-col gap-10">
            <h1 className="text-2xl font-bold">Мои списки</h1>
            <MovieSection
                title="К просмотру"
                icon={<Bookmark className="size-5 text-primary"/>}
                movies={watchlist}
                emptyText="Список пуст — нажмите «Буду смотреть» на странице фильма"
            />
            <MovieSection
                title="Просмотрено"
                icon={<Check className="size-5 text-primary"/>}
                movies={watched}
                emptyText="Пока ничего не отмечено просмотренным"
            />
        </div>
    );
}
