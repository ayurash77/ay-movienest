import type { ReactNode } from 'react';

import type { MovieCardData } from '@/server/movies';
import { MovieCard } from './MovieCard';

type MovieSectionProps = {
    title: string;
    icon?: ReactNode;
    movies: MovieCardData[];
    emptyText?: string;
};

export function MovieSection({ title, icon, movies, emptyText }: MovieSectionProps) {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold">
                {icon}
                {title}
            </h2>
            {movies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {emptyText ?? 'Пока нет фильмов'}
                </p>
            ) : (
                // pt-2 даёт карточкам место подняться при hover, не обрезаясь о overflow
                <div className="flex gap-4 overflow-x-auto pb-2 pt-2">
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie}/>
                    ))}
                </div>
            )}
        </section>
    );
}
