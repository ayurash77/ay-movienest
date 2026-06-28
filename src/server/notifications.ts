import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { formatRuDateTime } from '@/lib/date-format';

async function getDb() {
    return (await import('@/lib/db')).db;
}

async function getAuthUser() {
    return (await import('./session')).getAuthUser();
}

export type AppNotification = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    href: string | null;
    readAt: string | null;
    createdAt: string;
    createdAtLabel: string;
    actorName: string | null;
    movieTitle: string | null;
};

const notificationIdSchema = z.object({ notificationId: z.string().min(1) });

function mapNotification(item: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    href: string | null;
    readAt: Date | null;
    createdAt: Date;
    actor: { name: string } | null;
    movie: { title: string } | null;
}): AppNotification {
    const createdAt = item.createdAt.toISOString();
    return {
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        href: item.href,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt,
        createdAtLabel: formatRuDateTime(createdAt),
        actorName: item.actor?.name ?? null,
        movieTitle: item.movie?.title ?? null,
    };
}

export async function createMovieNotifications(movieId: string, actorId: string) {
    const db = await getDb();
    const movie = await db.movie.findUnique({
        where: { id: movieId },
        select: {
            id: true,
            title: true,
            kind: true,
            createdBy: { select: { id: true, name: true } },
        },
    });
    if (!movie?.createdBy) return;

    const [ followers, friends ] = await Promise.all([
        db.userFollow.findMany({
            where: { followingId: actorId },
            select: { followerId: true },
        }),
        db.userFriend.findMany({
            where: { friendId: actorId },
            select: { userId: true },
        }),
    ]);

    const recipientIds = [
        ...new Set([
            ...followers.map((item) => item.followerId),
            ...friends.map((item) => item.userId),
        ]),
    ].filter((id) => id !== actorId);
    if (!recipientIds.length) return;

    const kindLabel = movie.kind === 'SERIES'
        ? 'сериал'
        : movie.kind === 'CARTOON' ? 'мультфильм' : 'фильм';

    await db.notification.createMany({
        data: recipientIds.map((userId) => ({
            userId,
            actorId,
            movieId: movie.id,
            type: 'NEW_MOVIE',
            title: `${movie.createdBy!.name} добавил ${kindLabel}`,
            body: movie.title,
            href: `/movies/${movie.id}`,
        })),
        skipDuplicates: true,
    });
}

export async function createUserMessageNotification(input: {
    recipientId: string;
    actorId: string;
    title: string;
    body?: string | null;
    href?: string | null;
}) {
    const db = await getDb();
    if (input.recipientId === input.actorId) return;
    await db.notification.create({
        data: {
            userId: input.recipientId,
            actorId: input.actorId,
            type: 'USER_MESSAGE',
            title: input.title,
            body: input.body ?? null,
            href: input.href ?? null,
        },
    });
}

export const getUnreadNotificationCount = createServerFn({ method: 'GET' }).handler(async () => {
    const db = await getDb();
    const user = await getAuthUser();
    if (!user) return 0;
    return db.notification.count({ where: { userId: user.id, readAt: null } });
});

export const listNotifications = createServerFn({ method: 'GET' }).handler(async (): Promise<AppNotification[]> => {
    const db = await getDb();
    const user = await getAuthUser();
    if (!user) return [];

    const items = await db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 80,
        include: {
            actor: { select: { name: true } },
            movie: { select: { title: true } },
        },
    });

    return items.map(mapNotification);
});

export const markNotificationRead = createServerFn({ method: 'POST' })
    .validator(notificationIdSchema)
    .handler(async ({ data }) => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) return { ok: false as const, error: 'Нужен вход' };

        await db.notification.updateMany({
            where: { id: data.notificationId, userId: user.id, readAt: null },
            data: { readAt: new Date() },
        });

        return { ok: true as const };
    });

export const markAllNotificationsRead = createServerFn({ method: 'POST' }).handler(async () => {
    const db = await getDb();
    const user = await getAuthUser();
    if (!user) return { ok: false as const, error: 'Нужен вход' };

    await db.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
    });

    return { ok: true as const };
});
