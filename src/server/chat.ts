import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { formatRuDateTime } from '@/lib/date-format';
import { toServedUploadUrl } from '@/lib/upload-url';

async function getDb() {
    return (await import('@/lib/db')).db;
}

async function getAuthUser() {
    return (await import('./session')).getAuthUser();
}

type Db = Awaited<ReturnType<typeof getDb>>;

export type ChatUser = {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
};

export type ChatMessageData = {
    id: string;
    text: string;
    createdAt: string;
    createdAtLabel: string;
    author: ChatUser;
    isMine: boolean;
};

export type ChatThreadSummary = {
    id: string;
    friend: ChatUser | null;
    updatedAt: string;
    unreadCount: number;
    lastMessage: {
        text: string;
        createdAt: string;
        authorName: string;
        isMine: boolean;
    } | null;
};

export type ChatPageData = {
    ok: true;
    threads: ChatThreadSummary[];
    activeThread: ChatThreadSummary | null;
    messages: ChatMessageData[];
} | {
    ok: false;
    error: string;
    threads: ChatThreadSummary[];
    activeThread: null;
    messages: [];
};

const chatPageSchema = z.object({
    threadId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
});

const sendMessageSchema = z.object({
    threadId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    text: z.string().trim().min(1).max(2000),
});

const threadSchema = z.object({ threadId: z.string().min(1) });

function directThreadKey(a: string, b: string) {
    return [ a, b ].sort().join(':');
}

function mapChatUser(user: { id: string; name: string; email: string; avatarUrl: string | null }): ChatUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: toServedUploadUrl(user.avatarUrl),
    };
}

async function canChatWith(db: Db, userId: string, friendId: string) {
    if (userId === friendId) return false;
    const friendship = await db.userFriend.findFirst({
        where: {
            OR: [
                { userId, friendId },
                { userId: friendId, friendId: userId },
            ],
        },
        select: { id: true },
    });
    return Boolean(friendship);
}

async function getOrCreateDirectThread(db: Db, userId: string, friendId: string) {
    if (!await canChatWith(db, userId, friendId)) {
        return { ok: false as const, error: 'Чат доступен только с друзьями' };
    }

    const privateKey = directThreadKey(userId, friendId);
    const existing = await db.chatThread.findUnique({
        where: { privateKey },
        select: { id: true },
    });
    if (existing) return { ok: true as const, threadId: existing.id };

    try {
        const thread = await db.chatThread.create({
            data: {
                privateKey,
                participants: {
                    create: [
                        { userId },
                        { userId: friendId },
                    ],
                },
            },
            select: { id: true },
        });
        return { ok: true as const, threadId: thread.id };
    } catch {
        const thread = await db.chatThread.findUnique({
            where: { privateKey },
            select: { id: true },
        });
        if (thread) return { ok: true as const, threadId: thread.id };
        return { ok: false as const, error: 'Не удалось открыть чат' };
    }
}

async function assertParticipant(db: Db, threadId: string, userId: string) {
    const participant = await db.chatParticipant.findUnique({
        where: { threadId_userId: { threadId, userId } },
        select: { id: true },
    });
    return Boolean(participant);
}

async function unreadCounts(db: Db, userId: string) {
    const rows = await db.$queryRawUnsafe<Array<{ threadId: string; count: bigint }>>(
        `
            SELECT m."threadId", COUNT(m."id") AS count
            FROM "ChatParticipant" cp
            JOIN "ChatMessage" m ON m."threadId" = cp."threadId"
            WHERE cp."userId" = $1
                AND m."userId" <> $1
                AND (cp."lastReadAt" IS NULL OR m."createdAt" > cp."lastReadAt")
            GROUP BY m."threadId"
        `,
        userId,
    );
    return new Map(rows.map((row) => [ row.threadId, Number(row.count) ]));
}

async function mapThreads(db: Db, userId: string): Promise<ChatThreadSummary[]> {
    const [ threads, counts ] = await Promise.all([
        db.chatThread.findMany({
            where: { participants: { some: { userId } } },
            orderBy: { updatedAt: 'desc' },
            include: {
                participants: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
            },
        }),
        unreadCounts(db, userId),
    ]);

    return threads.map((thread) => {
        const friend = thread.participants.find((item) => item.userId !== userId)?.user ?? null;
        const latest = thread.messages[0] ?? null;
        return {
            id: thread.id,
            friend: friend ? mapChatUser(friend) : null,
            updatedAt: thread.updatedAt.toISOString(),
            unreadCount: counts.get(thread.id) ?? 0,
            lastMessage: latest
                ? {
                    text: latest.text,
                    createdAt: latest.createdAt.toISOString(),
                    authorName: latest.user.name,
                    isMine: latest.userId === userId,
                }
                : null,
        };
    });
}

async function getMessages(db: Db, threadId: string, userId: string): Promise<ChatMessageData[]> {
    const messages = await db.chatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
    });

    return messages.reverse().map((message) => {
        const createdAt = message.createdAt.toISOString();
        return {
            id: message.id,
            text: message.text,
            createdAt,
            createdAtLabel: formatRuDateTime(createdAt),
            author: mapChatUser(message.user),
            isMine: message.userId === userId,
        };
    });
}

async function markRead(db: Db, threadId: string, userId: string) {
    await Promise.all([
        db.chatParticipant.update({
            where: { threadId_userId: { threadId, userId } },
            data: { lastReadAt: new Date() },
        }),
        db.notification.updateMany({
            where: { userId, href: `/chat?thread=${threadId}`, readAt: null },
            data: { readAt: new Date() },
        }),
    ]);
}

export const getUnreadChatCount = createServerFn({ method: 'GET' }).handler(async () => {
    const db = await getDb();
    const user = await getAuthUser();
    if (!user) return 0;
    const rows = await db.$queryRawUnsafe<Array<{ count: bigint }>>(
        `
            SELECT COUNT(m."id") AS count
            FROM "ChatParticipant" cp
            JOIN "ChatMessage" m ON m."threadId" = cp."threadId"
            WHERE cp."userId" = $1
                AND m."userId" <> $1
                AND (cp."lastReadAt" IS NULL OR m."createdAt" > cp."lastReadAt")
        `,
        user.id,
    );
    return Number(rows[0]?.count ?? 0);
});

export const getChatPageData = createServerFn({ method: 'GET' })
    .validator(chatPageSchema)
    .handler(async ({ data }): Promise<ChatPageData> => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) {
            return { ok: false, error: 'Нужен вход', threads: [], activeThread: null, messages: [] };
        }

        let activeThreadId = data.threadId ?? null;
        if (!activeThreadId && data.userId) {
            const direct = await getOrCreateDirectThread(db, user.id, data.userId);
            if (!direct.ok) {
                return {
                    ok: false,
                    error: direct.error,
                    threads: await mapThreads(db, user.id),
                    activeThread: null,
                    messages: [],
                };
            }
            activeThreadId = direct.threadId;
        }

        if (activeThreadId) {
            const isParticipant = await assertParticipant(db, activeThreadId, user.id);
            if (!isParticipant) {
                return {
                    ok: false,
                    error: 'Диалог не найден',
                    threads: await mapThreads(db, user.id),
                    activeThread: null,
                    messages: [],
                };
            }
            await markRead(db, activeThreadId, user.id);
        }

        const [ threads, messages ] = await Promise.all([
            mapThreads(db, user.id),
            activeThreadId ? getMessages(db, activeThreadId, user.id) : Promise.resolve([]),
        ]);

        return {
            ok: true,
            threads,
            activeThread: activeThreadId
                ? threads.find((thread) => thread.id === activeThreadId) ?? null
                : null,
            messages,
        };
    });

export const sendChatMessage = createServerFn({ method: 'POST' })
    .validator(sendMessageSchema)
    .handler(async ({ data }) => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) return { ok: false as const, error: 'Нужен вход' };

        let threadId = data.threadId ?? null;
        if (!threadId && data.userId) {
            const direct = await getOrCreateDirectThread(db, user.id, data.userId);
            if (!direct.ok) return { ok: false as const, error: direct.error };
            threadId = direct.threadId;
        }
        if (!threadId) return { ok: false as const, error: 'Диалог не выбран' };

        if (!await assertParticipant(db, threadId, user.id)) {
            return { ok: false as const, error: 'Диалог не найден' };
        }

        const [ message, thread ] = await db.$transaction([
            db.chatMessage.create({
                data: { threadId, userId: user.id, text: data.text },
                include: { user: { select: { name: true } } },
            }),
            db.chatThread.update({
                where: { id: threadId },
                data: { updatedAt: new Date() },
                include: { participants: { select: { userId: true } } },
            }),
            db.chatParticipant.update({
                where: { threadId_userId: { threadId, userId: user.id } },
                data: { lastReadAt: new Date() },
            }),
        ]);

        const recipients = thread.participants
            .map((participant) => participant.userId)
            .filter((id) => id !== user.id);

        if (recipients.length) {
            try {
                const { createUserMessageNotification } = await import('./notifications');
                await Promise.all(recipients.map((recipientId) => createUserMessageNotification({
                    recipientId,
                    actorId: user.id,
                    title: `${message.user.name} написал сообщение`,
                    body: message.text.length > 180 ? `${message.text.slice(0, 177)}...` : message.text,
                    href: `/chat?thread=${threadId}`,
                })));
            } catch {
                // Уведомления не должны блокировать отправку сообщения.
            }
        }

        return { ok: true as const, threadId };
    });

export const markChatThreadRead = createServerFn({ method: 'POST' })
    .validator(threadSchema)
    .handler(async ({ data }) => {
        const db = await getDb();
        const user = await getAuthUser();
        if (!user) return { ok: false as const, error: 'Нужен вход' };
        if (!await assertParticipant(db, data.threadId, user.id)) {
            return { ok: false as const, error: 'Диалог не найден' };
        }

        await markRead(db, data.threadId, user.id);
        return { ok: true as const };
    });
