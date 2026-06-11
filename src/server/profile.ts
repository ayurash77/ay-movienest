import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from './password';
import { getAuthUser } from './session';

export type MyProfile = {
    name: string;
    email: string;
    createdAt: string;
    moviesAdded: number;
    ratingsCount: number;
    commentsCount: number;
    watchlistCount: number;
    watchedCount: number;
};

export const getMyProfile = createServerFn({ method: 'GET' }).handler(
    async (): Promise<MyProfile | null> => {
        const user = await getAuthUser();
        if (!user) return null;

        const [ record, moviesAdded, ratingsCount, commentsCount, watchlistCount, watchedCount ] =
            await Promise.all([
                db.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
                db.movie.count({ where: { createdById: user.id } }),
                db.rating.count({ where: { userId: user.id } }),
                db.comment.count({ where: { userId: user.id } }),
                db.watchEntry.count({ where: { userId: user.id, status: 'WATCHLIST' } }),
                db.watchEntry.count({ where: { userId: user.id, status: 'WATCHED' } }),
            ]);

        return {
            name: user.name,
            email: user.email,
            createdAt: record?.createdAt.toISOString() ?? new Date().toISOString(),
            moviesAdded,
            ratingsCount,
            commentsCount,
            watchlistCount,
            watchedCount,
        };
    },
);

export const updateName = createServerFn({ method: 'POST' })
    .validator(z.object({ name: z.string().trim().min(1).max(100) }))
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        await db.user.update({ where: { id: user.id }, data: { name: data.name } });
        return { ok: true as const };
    });

export const changePassword = createServerFn({ method: 'POST' })
    .validator(z.object({
        current: z.string().min(1),
        next: z.string().min(6).max(200),
    }))
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const record = await db.user.findUnique({ where: { id: user.id } });
        if (!record || !verifyPassword(data.current, record.passwordHash)) {
            return { ok: false as const, error: 'Текущий пароль неверный' };
        }

        await db.user.update({
            where: { id: user.id },
            data: { passwordHash: hashPassword(data.next) },
        });

        return { ok: true as const };
    });
