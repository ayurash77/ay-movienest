import { createFileRoute } from '@tanstack/react-router';
import { CalendarDays, Flame, Sparkles } from 'lucide-react';

import { MovieSection } from '@/components/movies/MovieSection';
import { getHomeMovies } from '@/server/movies';

export const Route = createFileRoute('/')({
    loader: async () => getHomeMovies(),
    component: HomePage,
});

function HomePage() {
    const { topWeek, topMonth, latest } = Route.useLoaderData();

    return (
        <div className="flex flex-col gap-10">
            <MovieSection
                title="Топ-10 недели"
                icon={<Flame className="size-5 text-primary"/>}
                movies={topWeek}
                emptyText="На этой неделе оценок ещё не было"
            />
            <MovieSection
                title="Топ-10 месяца"
                icon={<CalendarDays className="size-5 text-primary"/>}
                movies={topMonth}
                emptyText="В этом месяце оценок ещё не было"
            />
            <MovieSection
                title="Новинки"
                icon={<Sparkles className="size-5 text-primary"/>}
                movies={latest}
                emptyText="Фильмы ещё не добавлены"
            />
        </div>
    );
}
