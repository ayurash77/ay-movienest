import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db } from '@/lib/db';
import { toMovieCards, type MovieCardData } from '@/server/movies';
import { BOOTSTRAP_ADMIN_EMAILS, getAuthUser, resolveRole, type UserRole } from './session';

export type DashboardUserCard = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    movieCount: number;
    ratingCount: number;
    isFriend: boolean;
};

export type DashboardFriendCard = DashboardUserCard & {
    friendshipId: string;
    addedAt: string;
};

export type DashboardData = {
    friends: DashboardFriendCard[];
    myMovies: MovieCardData[];
    users: AdminUserCard[] | null;
};

export type AdminUserCard = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isBootstrapAdmin: boolean;
    createdAt: string;
    movieCount: number;
    ratingCount: number;
    commentCount: number;
};

const userSearchSchema = z.object({ q: z.string().trim().max(100).optional() });
const friendSchema = z.object({ friendId: z.string().min(1) });

function mapDashboardUser(
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        _count: { movies: number; ratings: number };
    },
    friendIds: Set<string>,
): DashboardUserCard {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: resolveRole(user.email, user.role),
        movieCount: user._count.movies,
        ratingCount: user._count.ratings,
        isFriend: friendIds.has(user.id),
    };
}

async function listAdminUsers(): Promise<AdminUserCard[]> {
    const users = await db.user.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            _count: { select: { movies: true, ratings: true, comments: true } },
        },
    });

    return users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: resolveRole(u.email, u.role),
        isBootstrapAdmin: BOOTSTRAP_ADMIN_EMAILS.includes(u.email.toLowerCase()),
        createdAt: u.createdAt.toISOString(),
        movieCount: u._count.movies,
        ratingCount: u._count.ratings,
        commentCount: u._count.comments,
    }));
}

export const setUserRole = createServerFn({ method: 'POST' })
    .validator(z.object({ userId: z.string().min(1), role: z.enum([ 'USER', 'ADMIN' ]) }))
    .handler(async ({ data }) => {
        const admin = await getAuthUser();
        if (!admin || admin.role !== 'ADMIN') return { ok: false as const, error: 'Доступ только для администраторов' };
        if (admin.id === data.userId && data.role !== 'ADMIN') {
            return { ok: false as const, error: 'Нельзя снять роль администратора с себя' };
        }

        const target = await db.user.findUnique({ where: { id: data.userId }, select: { email: true } });
        if (!target) return { ok: false as const, error: 'Пользователь не найден' };
        if (BOOTSTRAP_ADMIN_EMAILS.includes(target.email.toLowerCase()) && data.role !== 'ADMIN') {
            return { ok: false as const, error: 'Нельзя менять роль системного администратора' };
        }

        await db.user.update({ where: { id: data.userId }, data: { role: data.role } });
        return { ok: true as const };
    });

export const getDashboardData = createServerFn({ method: 'GET' }).handler(async (): Promise<DashboardData | null> => {
    const user = await getAuthUser();
    if (!user) return null;

    const [ friends, myMovieIds, users ] = await Promise.all([
        db.userFriend.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                friend: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        _count: { select: { movies: true, ratings: true } },
                    },
                },
            },
        }),
        db.movie.findMany({
            where: { createdById: user.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        }),
        user.role === 'ADMIN' ? listAdminUsers() : Promise.resolve(null),
    ]);

    const friendIds = new Set(friends.map((item) => item.friendId));
    const myMovieCards = await toMovieCards(myMovieIds.map((movie) => movie.id));

    return {
        friends: friends.map((item) => ({
            ...mapDashboardUser(item.friend, friendIds),
            friendshipId: item.id,
            addedAt: item.createdAt.toISOString(),
        })),
        myMovies: myMovieIds
            .map((movie) => myMovieCards.get(movie.id))
            .filter((movie): movie is MovieCardData => Boolean(movie)),
        users,
    };
});

export const searchUsersForFriends = createServerFn({ method: 'GET' })
    .validator(userSearchSchema)
    .handler(async ({ data }): Promise<DashboardUserCard[]> => {
        const user = await getAuthUser();
        if (!user) return [];

        const q = data.q?.trim();
        const friendships = await db.userFriend.findMany({
            where: { userId: user.id },
            select: { friendId: true },
        });
        const friendIds = new Set(friendships.map((item) => item.friendId));

        const users = await db.user.findMany({
            where: {
                id: { not: user.id },
                ...(q
                    ? {
                        OR: [
                            { name: { contains: q, mode: 'insensitive' } },
                            { email: { contains: q, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            orderBy: { name: 'asc' },
            take: 30,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                _count: { select: { movies: true, ratings: true } },
            },
        });

        return users.map((item) => mapDashboardUser(item, friendIds));
    });

export const addFriend = createServerFn({ method: 'POST' })
    .validator(friendSchema)
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) return { ok: false as const, error: 'Нужен вход' };
        if (data.friendId === user.id) return { ok: false as const, error: 'Нельзя добавить себя' };

        const target = await db.user.findUnique({ where: { id: data.friendId }, select: { id: true } });
        if (!target) return { ok: false as const, error: 'Пользователь не найден' };

        const existing = await db.userFriend.findUnique({
            where: { userId_friendId: { userId: user.id, friendId: data.friendId } },
            select: { id: true },
        });
        if (existing) return { ok: true as const, already: true };

        await db.userFriend.create({ data: { userId: user.id, friendId: data.friendId } });
        return { ok: true as const, already: false };
    });

export const removeFriend = createServerFn({ method: 'POST' })
    .validator(friendSchema)
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) return { ok: false as const, error: 'Нужен вход' };

        await db.userFriend
            .delete({ where: { userId_friendId: { userId: user.id, friendId: data.friendId } } })
            .catch(() => null);

        return { ok: true as const };
    });
