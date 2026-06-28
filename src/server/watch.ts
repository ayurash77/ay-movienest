import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

async function getDb() {
    return (await import('@/lib/db')).db;
}

async function getAuthUser() {
    return (await import('./session')).getAuthUser();
}

export const watchStatuses = [ 'WATCHLIST', 'WATCHED' ] as const;
export type WatchStatusValue = (typeof watchStatuses)[number];

export const setWatchStatus = createServerFn({ method: 'POST' })
    .validator(z.object({
        movieId: z.string().min(1),
        // null убирает фильм из списков
        status: z.enum(watchStatuses).nullable(),
    }))
    .handler(async ({ data }) => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        if (data.status === null) {
            await db.watchEntry
                .delete({ where: { movieId_userId: { movieId: data.movieId, userId: user.id } } })
                .catch(() => undefined);
            return { ok: true as const };
        }

        const movie = await db.movie.findUnique({ where: { id: data.movieId }, select: { id: true } });
        if (!movie) {
            return { ok: false as const, error: 'Фильм не найден' };
        }

        await db.watchEntry.upsert({
            where: { movieId_userId: { movieId: data.movieId, userId: user.id } },
            create: { movieId: data.movieId, userId: user.id, status: data.status },
            update: { status: data.status },
        });

        return { ok: true as const };
    });
