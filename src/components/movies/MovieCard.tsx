import { Link } from '@tanstack/react-router';

import type { MovieCardData } from '@/server/movies';
import { RatingStars } from './RatingStars';
import { MoviePoster } from './MoviePoster';
import { cn, formatRating } from '@/lib/utils';

export function MovieCard({ movie, className }: { movie: MovieCardData; className?: string }) {
    return (
        <Link
            to="/movies/$movieId"
            params={{ movieId: movie.id }}
            className={cn(
                'group flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10',
                className,
            )}
        >
            <MoviePoster posterUrl={movie.posterUrl} title={movie.title}/>
            <div className="flex flex-col gap-1.5 p-3">
                <div className="flex items-center gap-2">
                    <RatingStars value={movie.avgRating}/>
                    <span className="text-xs text-muted-foreground">
                        {movie.ratingCount > 0 ? formatRating(movie.avgRating) : '—'}
                    </span>
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-primary">
                    {movie.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                    {movie.year} · {movie.country}
                </p>
            </div>
        </Link>
    );
}
