import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { MovieCatalogControls } from '@/components/movies/MovieCatalogControls';
import { MovieGallery } from '@/components/movies/MovieGallery';
import { movieSortDirOptions, movieSortOptions } from '@/lib/movie-data';
import { searchMovies } from '@/server/movies';

export const Route = createFileRoute('/')({
    validateSearch: z.object({
        q: z.string().optional(),
        sort: z.enum(movieSortOptions).optional(),
        dir: z.enum(movieSortDirOptions).optional(),
    }),
    loaderDeps: ({ search }) => ({ q: search.q, sort: search.sort, dir: search.dir }),
    loader: async ({ deps }) => searchMovies({ data: deps }),
    component: HomePage,
});

function HomePage() {
    const movies = Route.useLoaderData();
    const { q, sort, dir } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Фильмотека</h1>
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
