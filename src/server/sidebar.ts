import { createServerFn } from '@tanstack/react-start';

async function getDb() {
    return (await import('@/lib/db')).db;
}

async function getAuthUser() {
    return (await import('./session')).getAuthUser();
}

type Db = Awaited<ReturnType<typeof getDb>>;

export type SidebarCounts = {
    libraryTotal: number;
    movies: number;
    series: number;
    cartoons: number;
    myMovies: number;
    friends: number;
    watchlist: number;
    watched: number;
    unreadNotifications: number;
    unreadChats: number;
};

const emptyUserCounts = {
    myMovies: 0,
    friends: 0,
    watchlist: 0,
    watched: 0,
    unreadNotifications: 0,
    unreadChats: 0,
};

async function unreadChatCount(db: Db, userId: string) {
    const rows = await db.$queryRawUnsafe<Array<{ count: bigint }>>(
        `
            SELECT COUNT(m."id") AS count
            FROM "ChatParticipant" cp
            JOIN "ChatMessage" m ON m."threadId" = cp."threadId"
            WHERE cp."userId" = $1
                AND m."userId" <> $1
                AND (cp."lastReadAt" IS NULL OR m."createdAt" > cp."lastReadAt")
        `,
        userId,
    );
    return Number(rows[0]?.count ?? 0);
}

export const getSidebarCounts = createServerFn({ method: 'GET' }).handler(async (): Promise<SidebarCounts> => {
    const db = await getDb();
    const user = await getAuthUser();

    const movieGroups = await db.movie.groupBy({
        by: [ 'kind' ],
        _count: { _all: true },
    });
    const movies = movieGroups.find((item) => item.kind === 'MOVIE')?._count._all ?? 0;
    const series = movieGroups.find((item) => item.kind === 'SERIES')?._count._all ?? 0;
    const cartoons = movieGroups.find((item) => item.kind === 'CARTOON')?._count._all ?? 0;

    const userCounts = user
        ? await Promise.all([
            db.movie.count({ where: { createdById: user.id } }),
            db.userFriend.count({ where: { userId: user.id } }),
            db.watchEntry.count({ where: { userId: user.id, status: 'WATCHLIST' } }),
            db.watchEntry.count({ where: { userId: user.id, status: 'WATCHED' } }),
            db.notification.count({ where: { userId: user.id, readAt: null } }),
            unreadChatCount(db, user.id),
        ])
        : null;

    return {
        libraryTotal: movies + series + cartoons,
        movies,
        series,
        cartoons,
        ...(userCounts
            ? {
                myMovies: userCounts[0],
                friends: userCounts[1],
                watchlist: userCounts[2],
                watched: userCounts[3],
                unreadNotifications: userCounts[4],
                unreadChats: userCounts[5],
            }
            : emptyUserCounts),
    };
});
