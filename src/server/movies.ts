import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db } from '@/lib/db';
import { getAuthUser } from './session';

export type MovieCardData = {
    id: string;
    title: string;
    year: number;
    country: string;
    posterUrl: string | null;
    avgRating: number;
    ratingCount: number;
};

export type HomeMovies = {
    topWeek: MovieCardData[];
    topMonth: MovieCardData[];
    latest: MovieCardData[];
};

export const movieSortOptions = [ 'new', 'rating', 'year', 'title' ] as const;
export type MovieSort = (typeof movieSortOptions)[number];

async function toMovieCards(ids: string[]): Promise<Map<string, MovieCardData>> {
    if (ids.length === 0) return new Map();

    const [ movies, aggregates ] = await Promise.all([
        db.movie.findMany({ where: { id: { in: ids } } }),
        db.rating.groupBy({
            by: [ 'movieId' ],
            where: { movieId: { in: ids } },
            _avg: { value: true },
            _count: { _all: true },
        }),
    ]);

    const aggByMovie = new Map(aggregates.map((a) => [ a.movieId, a ]));

    return new Map(
        movies.map((movie) => {
            const agg = aggByMovie.get(movie.id);
            return [
                movie.id,
                {
                    id: movie.id,
                    title: movie.title,
                    year: movie.year,
                    country: movie.country,
                    posterUrl: movie.posterUrl,
                    avgRating: agg?._avg.value ?? 0,
                    ratingCount: agg?._count._all ?? 0,
                },
            ];
        }),
    );
}

async function topRatedSince(since: Date, take: number) {
    const grouped = await db.rating.groupBy({
        by: [ 'movieId' ],
        where: { createdAt: { gte: since } },
        _avg: { value: true },
        _count: { movieId: true },
        orderBy: [
            { _avg: { value: 'desc' } },
            { _count: { movieId: 'desc' } },
        ],
        take,
    });
    return grouped.map((g) => g.movieId);
}

export const getHomeMovies = createServerFn({ method: 'GET' }).handler(
    async (): Promise<HomeMovies> => {
        const now = Date.now();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const [ weekIds, monthIds, latestMovies ] = await Promise.all([
            topRatedSince(weekAgo, 10),
            topRatedSince(monthAgo, 10),
            db.movie.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true },
            }),
        ]);

        const latestIds = latestMovies.map((m) => m.id);
        const cards = await toMovieCards([
            ...new Set([ ...weekIds, ...monthIds, ...latestIds ]),
        ]);

        const pick = (ids: string[]) =>
            ids.map((id) => cards.get(id)).filter((c): c is MovieCardData => Boolean(c));

        return {
            topWeek: pick(weekIds),
            topMonth: pick(monthIds),
            latest: pick(latestIds),
        };
    },
);

const searchMoviesSchema = z.object({
    q: z.string().trim().max(200).optional(),
    sort: z.enum(movieSortOptions).optional(),
});

export const searchMovies = createServerFn({ method: 'GET' })
    .validator(searchMoviesSchema)
    .handler(async ({ data }): Promise<MovieCardData[]> => {
        const q = data.q;
        const movies = await db.movie.findMany({
            where: q
                ? {
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { director: { contains: q, mode: 'insensitive' } },
                        { country: { contains: q, mode: 'insensitive' } },
                        { genres: { has: q.toLowerCase() } },
                    ],
                }
                : {},
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: { id: true },
        });

        const cards = await toMovieCards(movies.map((m) => m.id));
        // toMovieCards loses findMany order; movies array keeps createdAt desc
        const list = movies
            .map((m) => cards.get(m.id))
            .filter((c): c is MovieCardData => Boolean(c));

        const sort: MovieSort = data.sort ?? 'new';
        if (sort === 'rating') {
            list.sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount);
        } else if (sort === 'year') {
            list.sort((a, b) => b.year - a.year);
        } else if (sort === 'title') {
            list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
        }

        return list;
    });

export type MovieDetails = {
    id: string;
    title: string;
    year: number;
    country: string;
    description: string;
    posterUrl: string | null;
    director: string | null;
    genres: string[];
    durationMin: number | null;
    createdAt: string;
    addedBy: string | null;
    avgRating: number;
    ratingCount: number;
    myRating: number | null;
};

export const getMovie = createServerFn({ method: 'GET' })
    .validator(z.object({ id: z.string().min(1) }))
    .handler(async ({ data }): Promise<MovieDetails | null> => {
        const user = await getAuthUser();

        const movie = await db.movie.findUnique({
            where: { id: data.id },
            include: { createdBy: { select: { name: true } } },
        });
        if (!movie) return null;

        const [ agg, myRating ] = await Promise.all([
            db.rating.aggregate({
                where: { movieId: movie.id },
                _avg: { value: true },
                _count: { _all: true },
            }),
            user
                ? db.rating.findUnique({
                    where: { movieId_userId: { movieId: movie.id, userId: user.id } },
                })
                : null,
        ]);

        return {
            id: movie.id,
            title: movie.title,
            year: movie.year,
            country: movie.country,
            description: movie.description,
            posterUrl: movie.posterUrl,
            director: movie.director,
            genres: movie.genres,
            durationMin: movie.durationMin,
            createdAt: movie.createdAt.toISOString(),
            addedBy: movie.createdBy?.name ?? null,
            avgRating: agg._avg.value ?? 0,
            ratingCount: agg._count._all,
            myRating: myRating?.value ?? null,
        };
    });

const createMovieSchema = z.object({
    title: z.string().trim().min(1).max(200),
    year: z.coerce.number().int().min(1888).max(2100),
    country: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(5000),
    // Either an external https URL or a local /uploads/... path from uploadPoster
    posterUrl: z
        .union([
            z.literal(''),
            z.string().trim().url(),
            z.string().trim().regex(/^\/uploads\/posters\/[\w.-]+$/),
        ])
        .optional(),
    director: z.string().trim().max(200).optional(),
    genres: z.string().trim().max(300).optional(),
    durationMin: z.union([ z.literal(''), z.coerce.number().int().min(1).max(1000) ]).optional(),
});

export const createMovie = createServerFn({ method: 'POST' })
    .validator(createMovieSchema)
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const movie = await db.movie.create({
            data: {
                title: data.title,
                year: data.year,
                country: data.country,
                description: data.description,
                posterUrl: data.posterUrl || null,
                director: data.director || null,
                genres: data.genres
                    ? data.genres.split(',').map((g) => g.trim()).filter(Boolean)
                    : [],
                durationMin: data.durationMin === '' ? null : data.durationMin ?? null,
                createdById: user.id,
            },
        });

        return { ok: true as const, movieId: movie.id };
    });

export const rateMovie = createServerFn({ method: 'POST' })
    .validator(z.object({ movieId: z.string().min(1), value: z.number().int().min(1).max(5) }))
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const movie = await db.movie.findUnique({ where: { id: data.movieId }, select: { id: true } });
        if (!movie) {
            return { ok: false as const, error: 'Фильм не найден' };
        }

        await db.rating.upsert({
            where: { movieId_userId: { movieId: data.movieId, userId: user.id } },
            create: { movieId: data.movieId, userId: user.id, value: data.value },
            update: { value: data.value, createdAt: new Date() },
        });

        return { ok: true as const };
    });
