import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { z } from 'zod';

import { MovieCard } from '@/components/movies/MovieCard';
import { Input } from '@/components/ui/input';
import { movieSortOptions, searchMovies, type MovieSort } from '@/server/movies';

const SORT_LABELS: Record<MovieSort, string> = {
    new: 'Сначала новые',
    rating: 'По рейтингу',
    year: 'По году выпуска',
    title: 'По названию',
};

export const Route = createFileRoute('/movies/')({
    validateSearch: z.object({
        q: z.string().optional(),
        sort: z.enum(movieSortOptions).optional(),
    }),
    loaderDeps: ({ search }) => ({ q: search.q, sort: search.sort }),
    loader: async ({ deps }) => searchMovies({ data: deps }),
    component: MoviesPage,
});

function MoviesPage() {
    const movies = Route.useLoaderData();
    const { q, sort } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const [ query, setQuery ] = useState(q ?? '');

    // Debounce typing before pushing the query into the URL (and the loader)
    useEffect(() => {
        const handle = setTimeout(() => {
            const trimmed = query.trim();
            if (trimmed === (q ?? '')) return;
            navigate({
                search: (prev) => ({ ...prev, q: trimmed || undefined }),
                replace: true,
            });
        }, 300);
        return () => clearTimeout(handle);
    }, [ query, q, navigate ]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold">Все фильмы</h1>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Название, режиссёр, страна, жанр…"
                            className="w-full pl-8 sm:w-72"
                            aria-label="Поиск фильмов"
                        />
                    </div>
                    <select
                        value={sort ?? 'new'}
                        onChange={(e) =>
                            navigate({
                                search: (prev) => ({
                                    ...prev,
                                    sort: e.target.value === 'new'
                                        ? undefined
                                        : (e.target.value as MovieSort),
                                }),
                                replace: true,
                            })
                        }
                        aria-label="Сортировка"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                        {movieSortOptions.map((option) => (
                            <option key={option} value={option}>
                                {SORT_LABELS[option]}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {movies.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">
                    Ничего не найдено{q ? ` по запросу «${q}»` : ''}
                </p>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} className="w-full"/>
                    ))}
                </div>
            )}
        </div>
    );
}
