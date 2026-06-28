import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db } from '@/lib/db';
import { getAuthUser } from './session';

export type MovieCardData = {
    id: string;
    kind: MovieKind;
    title: string;
    year: number;
    country: string;
    posterUrl: string | null;
    seasonsCount: number | null;
    episodesPerSeason: number[];
    avgRating: number;
    ratingCount: number;
    commentCount: number;
};

export type HomeMovies = {
    latest: MovieCardData[];
};

export const movieSortOptions = [ 'new', 'rating', 'year', 'title' ] as const;
export type MovieSort = (typeof movieSortOptions)[number];
export const movieSortDirOptions = [ 'asc', 'desc' ] as const;
export type MovieSortDir = (typeof movieSortDirOptions)[number];
export const movieKindOptions = [ 'MOVIE', 'SERIES', 'CARTOON' ] as const;
export type MovieKind = (typeof movieKindOptions)[number];

export async function toMovieCards(ids: string[]): Promise<Map<string, MovieCardData>> {
    if (ids.length === 0) return new Map();

    const [ movies, aggregates, commentCounts ] = await Promise.all([
        db.movie.findMany({ where: { id: { in: ids } } }),
        db.rating.groupBy({
            by: [ 'movieId' ],
            where: { movieId: { in: ids } },
            _avg: { value: true },
            _count: { _all: true },
        }),
        db.comment.groupBy({
            by: [ 'movieId' ],
            where: { movieId: { in: ids } },
            _count: { _all: true },
        }),
    ]);

    const aggByMovie = new Map(aggregates.map((a) => [ a.movieId, a ]));
    const commentsByMovie = new Map(commentCounts.map((c) => [ c.movieId, c._count._all ]));

    return new Map(
        movies.map((movie) => {
            const agg = aggByMovie.get(movie.id);
            return [
                movie.id,
                {
                    id: movie.id,
                    kind: movie.kind,
                    title: movie.title,
                    year: movie.year,
                    country: movie.country,
                    posterUrl: movie.posterUrl,
                    seasonsCount: movie.seasonsCount,
                    episodesPerSeason: movie.episodesPerSeason,
                    avgRating: agg?._avg.value ?? 0,
                    ratingCount: agg?._count._all ?? 0,
                    commentCount: commentsByMovie.get(movie.id) ?? 0,
                },
            ];
        }),
    );
}

export const getHomeMovies = createServerFn({ method: 'GET' }).handler(
    async (): Promise<HomeMovies> => {
        const latestMovies = await db.movie.findMany({
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: { id: true },
        });

        const latestIds = latestMovies.map((m) => m.id);
        const cards = await toMovieCards(latestIds);

        const pick = (ids: string[]) =>
            ids.map((id) => cards.get(id)).filter((c): c is MovieCardData => Boolean(c));

        return {
            latest: pick(latestIds),
        };
    },
);

const searchMoviesSchema = z.object({
    q: z.string().trim().max(200).optional(),
    sort: z.enum(movieSortOptions).optional(),
    dir: z.enum(movieSortDirOptions).optional(),
    kind: z.enum(movieKindOptions).optional(),
});

export const searchMovies = createServerFn({ method: 'GET' })
    .validator(searchMoviesSchema)
    .handler(async ({ data }): Promise<MovieCardData[]> => {
        const q = data.q;
        const movies = await db.movie.findMany({
            where: q
                ? {
                    AND: [
                        data.kind ? { kind: data.kind } : {},
                        {
                            OR: [
                                { title: { contains: q, mode: 'insensitive' } },
                                { director: { contains: q, mode: 'insensitive' } },
                                { country: { contains: q, mode: 'insensitive' } },
                                { genres: { has: q.toLowerCase() } },
                            ],
                        },
                    ],
                }
                : data.kind ? { kind: data.kind } : {},
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
        const dir: MovieSortDir = data.dir ?? 'desc';
        const factor = dir === 'asc' ? -1 : 1;
        if (sort === 'rating') {
            list.sort((a, b) => factor * (b.avgRating - a.avgRating || b.ratingCount - a.ratingCount));
        } else if (sort === 'year') {
            list.sort((a, b) => factor * (b.year - a.year));
        } else if (sort === 'title') {
            list.sort((a, b) => factor * b.title.localeCompare(a.title, 'ru'));
        } else if (dir === 'asc') {
            list.reverse();
        }

        return list;
    });

export type MovieDetails = {
    id: string;
    kind: MovieKind;
    title: string;
    year: number;
    country: string;
    description: string;
    posterUrl: string | null;
    trailerUrl: string | null;
    director: string | null;
    genres: string[];
    starring: string[];
    durationMin: number | null;
    seasonsCount: number | null;
    episodesPerSeason: number[];
    createdAt: string;
    addedBy: string | null;
    avgRating: number;
    ratingCount: number;
    myRating: number | null;
    myWatchStatus: 'WATCHLIST' | 'WATCHED' | null;
    canEdit: boolean;
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

        const [ agg, myRating, myWatch ] = await Promise.all([
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
            user
                ? db.watchEntry.findUnique({
                    where: { movieId_userId: { movieId: movie.id, userId: user.id } },
                })
                : null,
        ]);

        return {
            id: movie.id,
            kind: movie.kind,
            title: movie.title,
            year: movie.year,
            country: movie.country,
            description: movie.description,
            posterUrl: movie.posterUrl,
            trailerUrl: movie.trailerUrl,
            director: movie.director,
            genres: movie.genres,
            starring: movie.starring,
            durationMin: movie.durationMin,
            seasonsCount: movie.seasonsCount,
            episodesPerSeason: movie.episodesPerSeason,
            createdAt: movie.createdAt.toISOString(),
            addedBy: movie.createdBy?.name ?? null,
            avgRating: agg._avg.value ?? 0,
            ratingCount: agg._count._all,
            myRating: myRating?.value ?? null,
            myWatchStatus: myWatch?.status ?? null,
            canEdit: Boolean(user && (movie.createdById === user.id || user.role === 'ADMIN')),
        };
    });

const movieFieldsSchema = z.object({
    kind: z.enum(movieKindOptions).optional(),
    title: z.string().trim().min(1).max(200),
    year: z.coerce.number().int().min(1888).max(2100),
    country: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(5000),
    // External https URL, an uploaded /uploads/posters/... path, or a seed /posters/... path
    posterUrl: z
        .union([
            z.literal(''),
            z.string().trim().url(),
            z.string().trim().regex(/^\/(?:uploads\/)?posters\/[\w.-]+$/),
        ])
        .optional(),
    trailerUrl: z.union([ z.literal(''), z.string().trim().url() ]).optional(),
    director: z.string().trim().max(200).optional(),
    genres: z.string().trim().max(300).optional(),
    starring: z.string().trim().max(500).optional(),
    durationMin: z.union([ z.literal(''), z.coerce.number().int().min(1).max(1000) ]).optional(),
    seasonsCount: z.union([ z.literal(''), z.coerce.number().int().min(1).max(100) ]).optional(),
    episodesPerSeason: z.string().trim().max(500).optional(),
});

export type MovieFormFields = {
    kind?: MovieKind;
    title: string;
    year: number;
    country: string;
    description: string;
    posterUrl?: string;
    trailerUrl?: string;
    director?: string;
    genres?: string;
    starring?: string;
    durationMin?: number | '';
    seasonsCount?: number | '';
    episodesPerSeason?: string;
};

function splitList(value: string | undefined) {
    return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function toMovieData(data: z.output<typeof movieFieldsSchema>) {
    return {
        title: data.title,
        kind: data.kind ?? 'MOVIE',
        year: data.year,
        country: data.country,
        description: data.description,
        posterUrl: data.posterUrl || null,
        trailerUrl: data.trailerUrl || null,
        director: data.director || null,
        genres: splitList(data.genres),
        starring: splitList(data.starring),
        durationMin: data.durationMin === '' ? null : data.durationMin ?? null,
        seasonsCount: data.kind === 'SERIES' && data.seasonsCount !== ''
            ? data.seasonsCount ?? null
            : null,
        episodesPerSeason: data.kind === 'SERIES'
            ? splitList(data.episodesPerSeason).map(Number).filter((value) => Number.isInteger(value) && value > 0)
            : [],
    };
}

export const createMovie = createServerFn({ method: 'POST' })
    .validator(movieFieldsSchema)
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const movie = await db.movie.create({
            data: { ...toMovieData(data), createdById: user.id },
        });

        return { ok: true as const, movieId: movie.id };
    });

export const updateMovie = createServerFn({ method: 'POST' })
    .validator(movieFieldsSchema.extend({ movieId: z.string().min(1) }))
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const movie = await db.movie.findUnique({
            where: { id: data.movieId },
            select: { createdById: true },
        });
        if (!movie) {
            return { ok: false as const, error: 'Фильм не найден' };
        }
        if (movie.createdById !== user.id && user.role !== 'ADMIN') {
            return { ok: false as const, error: 'Редактировать может только добавивший фильм' };
        }

        const { movieId, ...fields } = data;
        await db.movie.update({ where: { id: movieId }, data: toMovieData(fields) });

        return { ok: true as const, movieId };
    });

export const getMyLists = createServerFn({ method: 'GET' }).handler(
    async (): Promise<{ watchlist: MovieCardData[]; watched: MovieCardData[] } | null> => {
        const user = await getAuthUser();
        if (!user) return null;

        const entries = await db.watchEntry.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
            select: { movieId: true, status: true },
        });

        const cards = await toMovieCards(entries.map((e) => e.movieId));
        const pick = (status: 'WATCHLIST' | 'WATCHED') =>
            entries
                .filter((e) => e.status === status)
                .map((e) => cards.get(e.movieId))
                .filter((c): c is MovieCardData => Boolean(c));

        return { watchlist: pick('WATCHLIST'), watched: pick('WATCHED') };
    },
);

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
