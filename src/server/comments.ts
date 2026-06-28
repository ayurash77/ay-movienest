import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

async function getDb() {
    return (await import('@/lib/db')).db;
}

async function getAuthUser() {
    return (await import('./session')).getAuthUser();
}

export type MovieComment = {
    id: string;
    text: string;
    createdAt: string;
    authorName: string;
    isMine: boolean;
};

export const getComments = createServerFn({ method: 'GET' })
    .validator(z.object({ movieId: z.string().min(1) }))
    .handler(async ({ data }): Promise<MovieComment[]> => {
        const db = await getDb();
        const user = await getAuthUser();
        const comments = await db.comment.findMany({
            where: { movieId: data.movieId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { user: { select: { id: true, name: true } } },
        });

        return comments.map((comment) => ({
            id: comment.id,
            text: comment.text,
            createdAt: comment.createdAt.toISOString(),
            authorName: comment.user.name,
            isMine: comment.user.id === user?.id,
        }));
    });

export const addComment = createServerFn({ method: 'POST' })
    .validator(z.object({
        movieId: z.string().min(1),
        text: z.string().trim().min(1).max(2000),
    }))
    .handler(async ({ data }) => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const movie = await db.movie.findUnique({ where: { id: data.movieId }, select: { id: true } });
        if (!movie) {
            return { ok: false as const, error: 'Фильм не найден' };
        }

        const comment = await db.comment.create({
            data: { movieId: data.movieId, userId: user.id, text: data.text },
        });
        try {
            const { createCommentNotifications } = await import('./notifications');
            await createCommentNotifications(comment.id);
        } catch {
            // Уведомления не должны блокировать отправку комментария.
        }

        return { ok: true as const };
    });

export const deleteComment = createServerFn({ method: 'POST' })
    .validator(z.object({ commentId: z.string().min(1) }))
    .handler(async ({ data }) => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const comment = await db.comment.findUnique({ where: { id: data.commentId } });
        if (!comment || comment.userId !== user.id) {
            return { ok: false as const, error: 'Можно удалять только свои комментарии' };
        }

        await db.comment.delete({ where: { id: data.commentId } });
        return { ok: true as const };
    });
