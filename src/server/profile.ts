import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { toServedUploadUrl } from '@/lib/upload-url';

async function getDb() {
    return (await import('@/lib/db')).db;
}

async function getAuthUser() {
    return (await import('./session')).getAuthUser();
}

export type MyProfile = {
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
    moviesAdded: number;
    ratingsCount: number;
    commentsCount: number;
    watchlistCount: number;
    watchedCount: number;
};

const AVATAR_EXT_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const getMyProfile = createServerFn({ method: 'GET' }).handler(
    async (): Promise<MyProfile | null> => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) return null;

        const [ record, moviesAdded, ratingsCount, commentsCount, watchlistCount, watchedCount ] =
            await Promise.all([
                db.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true, createdAt: true } }),
                db.movie.count({ where: { createdById: user.id } }),
                db.rating.count({ where: { userId: user.id } }),
                db.comment.count({ where: { userId: user.id } }),
                db.watchEntry.count({ where: { userId: user.id, status: 'WATCHLIST' } }),
                db.watchEntry.count({ where: { userId: user.id, status: 'WATCHED' } }),
            ]);

        return {
            name: user.name,
            email: user.email,
            avatarUrl: toServedUploadUrl(record?.avatarUrl),
            role: user.role,
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
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        await db.user.update({ where: { id: user.id }, data: { name: data.name } });
        return { ok: true as const };
    });

export const uploadMyAvatar = createServerFn({ method: 'POST' })
    .validator((data: unknown) => {
        if (!(data instanceof FormData)) {
            throw new Error('Expected FormData');
        }
        return data;
    })
    .handler(async ({ data }) => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const file = data.get('file');
        if (!(file instanceof File) || file.size === 0) {
            return { ok: false as const, error: 'Файл не найден' };
        }
        if (file.size > MAX_AVATAR_BYTES) {
            return { ok: false as const, error: 'Файл больше 5 МБ' };
        }

        const ext = AVATAR_EXT_BY_MIME[file.type];
        if (!ext) {
            return { ok: false as const, error: 'Поддерживаются только JPEG, PNG и WebP' };
        }

        try {
            const { storeUpload } = await import('./storage');
            const { url } = await storeUpload(
                'avatars',
                ext,
                Buffer.from(await file.arrayBuffer()),
                file.type,
            );
            await db.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
            return { ok: true as const, url };
        } catch {
            return { ok: false as const, error: 'Не удалось сохранить файл' };
        }
    });

export const changePassword = createServerFn({ method: 'POST' })
    .validator(z.object({
        current: z.string().min(1),
        next: z.string().min(6).max(200),
    }))
    .handler(async ({ data }) => {
        const db = await getDb();
        const { hashPassword, verifyPassword } = await import('./password');
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
