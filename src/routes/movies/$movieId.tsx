import { createFileRoute, Link, notFound, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Clock, Globe, User } from 'lucide-react';
import { toast } from 'sonner';

import { MoviePoster } from '@/components/movies/MoviePoster';
import { RatingStars } from '@/components/movies/RatingStars';
import { Button } from '@/components/ui/button';
import { formatRating } from '@/lib/utils';
import { getMovie, rateMovie } from '@/server/movies';

export const Route = createFileRoute('/movies/$movieId')({
    loader: async ({ params }) => {
        const movie = await getMovie({ data: { id: params.movieId } });
        if (!movie) throw notFound();
        return movie;
    },
    component: MoviePage,
    notFoundComponent: () => (
        <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-lg text-muted-foreground">Фильм не найден</p>
            <Button asChild variant="outline">
                <Link to="/">На главную</Link>
            </Button>
        </div>
    ),
});

function MoviePage() {
    const movie = Route.useLoaderData();
    const { user } = Route.useRouteContext();
    const router = useRouter();

    const handleRate = async (value: number) => {
        const result = await rateMovie({ data: { movieId: movie.id, value } });
        if (result.ok) {
            toast.success(`Ваша оценка: ${value} из 5`);
            await router.invalidate();
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Button asChild variant="ghost" size="sm" className="self-start">
                <Link to="/">
                    <ArrowLeft/>
                    Назад
                </Link>
            </Button>

            <div className="flex flex-col gap-8 md:flex-row">
                <div className="w-full max-w-72 shrink-0 self-start overflow-hidden rounded-xl border border-border">
                    <MoviePoster posterUrl={movie.posterUrl} title={movie.title}/>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-5">
                    <div>
                        <h1 className="text-3xl font-bold">{movie.title}</h1>
                        <p className="mt-1 text-muted-foreground">
                            {movie.year} · {movie.country}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <RatingStars value={movie.avgRating}/>
                        <span className="text-sm text-muted-foreground">
                            {movie.ratingCount > 0
                                ? `${formatRating(movie.avgRating)} · ${movie.ratingCount} оцен.`
                                : 'Оценок пока нет'}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        {movie.director ? (
                            <span className="inline-flex items-center gap-1.5">
                                <User className="size-4"/>
                                Режиссёр: {movie.director}
                            </span>
                        ) : null}
                        {movie.durationMin ? (
                            <span className="inline-flex items-center gap-1.5">
                                <Clock className="size-4"/>
                                {movie.durationMin} мин
                            </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5">
                            <Globe className="size-4"/>
                            {movie.country}
                        </span>
                    </div>

                    {movie.genres.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {movie.genres.map((genre) => (
                                <span
                                    key={genre}
                                    className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>
                    ) : null}

                    <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                        {movie.description}
                    </p>

                    <div className="mt-2 rounded-xl border border-border bg-card p-4">
                        {user ? (
                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium">
                                    {movie.myRating
                                        ? `Ваша оценка: ${movie.myRating} из 5`
                                        : 'Оцените фильм'}
                                </span>
                                <RatingStars
                                    value={movie.myRating ?? 0}
                                    onRate={handleRate}
                                    size="lg"
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                <Link to="/sign-in" className="text-primary hover:underline">
                                    Войдите
                                </Link>
                                , чтобы оценить фильм
                            </p>
                        )}
                    </div>

                    {movie.addedBy ? (
                        <p className="text-xs text-muted-foreground">
                            Добавил(а): {movie.addedBy}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
