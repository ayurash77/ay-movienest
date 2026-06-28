import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { MovieCatalogControls } from '@/components/movies/MovieCatalogControls';
import { MovieGallery } from '@/components/movies/MovieGallery';
import { movieKindOptions, movieSortDirOptions, movieSortOptions, type MovieKind } from '@/lib/movie-data';
import {
    searchMovies,
} from '@/server/movies';

const KIND_TITLES: Record<MovieKind, string> = {
    MOVIE: 'Фильмы',
    SERIES: 'Сериалы',
    CARTOON: 'Мультфильмы',
};

export const Route = createFileRoute('/movies/')({
    validateSearch: z.object({
        q: z.string().optional(),
        sort: z.enum(movieSortOptions).optional(),
        dir: z.enum(movieSortDirOptions).optional(),
        kind: z.enum(movieKindOptions).optional(),
    }),
    loaderDeps: ({ search }) => ({ q: search.q, sort: search.sort, dir: search.dir, kind: search.kind }),
    loader: async ({ deps }) => searchMovies({ data: deps }),
    component: MoviesPage,
});

function MoviesPage() {
    const movies = Route.useLoaderData();
    const { q, sort, dir, kind } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const title = kind ? KIND_TITLES[kind] : 'Все фильмы';

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">{title}</h1>

            <MovieGallery
                movies={movies}
                emptyText={`Ничего не найдено${q ? ` по запросу «${q}»` : ''}`}
                controlsStart={
                    <MovieCatalogControls
                        q={q}
                        sort={sort}
                        dir={dir}
                        onQueryChange={(nextQ) =>
                            navigate({ search: (prev) => ({ ...prev, q: nextQ }), replace: true })
                        }
                        onSortChange={(nextSort) =>
                            navigate({ search: (prev) => ({ ...prev, sort: nextSort }), replace: true })
                        }
                        onDirChange={(nextDir) =>
                            navigate({ search: (prev) => ({ ...prev, dir: nextDir }), replace: true })
                        }
                    />
                }
            />
        </div>
    );
}
