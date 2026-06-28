import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageTitle } from '@/components/AppTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    getChatPageData,
    sendChatMessage,
    type ChatMessageData,
    type ChatThreadSummary,
    type ChatUser,
} from '@/server/chat';

export const Route = createFileRoute('/chat')({
    validateSearch: z.object({
        thread: z.string().optional(),
        user: z.string().optional(),
    }),
    loaderDeps: ({ search }) => ({ thread: search.thread, user: search.user }),
    beforeLoad: ({ context, location }) => {
        if (!context.user) {
            throw redirect({ to: '/sign-in', search: { redirectTo: location.href } });
        }
    },
    loader: async ({ deps }) => getChatPageData({ data: { threadId: deps.thread, userId: deps.user } }),
    component: ChatPage,
});

function notifyChatChanged() {
    window.dispatchEvent(new Event('movienest:chat-changed'));
    window.dispatchEvent(new Event('movienest:notifications-changed'));
}

function ChatAvatar({ user, className = 'size-10' }: { user: Pick<ChatUser, 'name' | 'avatarUrl'> | null; className?: string }) {
    const name = user?.name ?? 'Диалог';
    return user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className={cn('shrink-0 rounded-full object-cover', className)}/>
    ) : (
        <span className={cn('grid shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground', className)}>
            {name.trim()[0]?.toUpperCase() ?? '?'}
        </span>
    );
}

function ThreadButton({ thread, active }: { thread: ChatThreadSummary; active: boolean }) {
    const title = thread.friend?.name ?? 'Диалог';
    return (
        <Link
            to="/chat"
            search={{ thread: thread.id }}
            className={cn(
                'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-accent',
                active && 'bg-card-active',
            )}
        >
            <ChatAvatar user={thread.friend}/>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{title}</span>
                    {thread.unreadCount ? (
                        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {thread.unreadCount}
                        </span>
                    ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {thread.lastMessage
                        ? `${thread.lastMessage.isMine ? 'Вы: ' : ''}${thread.lastMessage.text}`
                        : 'Пока нет сообщений'}
                </span>
            </span>
        </Link>
    );
}

function MessageBubble({ message }: { message: ChatMessageData }) {
    return (
        <div className={cn('flex items-end gap-2', message.isMine ? 'justify-end' : 'justify-start')}>
            {!message.isMine ? <ChatAvatar user={message.author} className="size-7"/> : null}
            <div
                className={cn(
                    'max-w-[82%] rounded-2xl px-3 py-2 shadow-[0_8px_22px_rgb(0_0_0/0.16)]',
                    message.isMine
                        ? 'rounded-br-md bg-primary/75 text-primary-foreground'
                        : 'rounded-bl-md bg-card text-card-foreground',
                )}
            >
                {!message.isMine ? (
                    <div className="mb-1 text-xs font-semibold text-primary">{message.author.name}</div>
                ) : null}
                <p className="whitespace-pre-line text-sm leading-relaxed">{message.text}</p>
                <div className={cn(
                    'mt-1 text-right text-[10px]',
                    message.isMine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}>
                    {message.createdAtLabel}
                </div>
            </div>
        </div>
    );
}

function ChatPage() {
    const data = Route.useLoaderData();
    const router = useRouter();
    const [ text, setText ] = useState('');
    const [ isSending, setIsSending ] = useState(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const activeThreadId = data.ok ? data.activeThread?.id ?? null : null;

    useEffect(() => {
        const timer = window.setInterval(async () => {
            await router.invalidate();
            notifyChatChanged();
        }, activeThreadId ? 3000 : 10000);
        return () => window.clearInterval(timer);
    }, [ activeThreadId, router ]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
        if (activeThreadId) notifyChatChanged();
    }, [ activeThreadId, data.ok ? data.messages.length : 0 ]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!data.ok || !data.activeThread) return;
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        setIsSending(true);
        try {
            const result = await sendChatMessage({
                data: { threadId: data.activeThread.id, text: trimmed },
            });
            if (result.ok) {
                setText('');
                await router.invalidate();
                notifyChatChanged();
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('Не удалось отправить сообщение');
        } finally {
            setIsSending(false);
        }
    };

    const threads = data.threads;
    const messages = data.ok ? data.messages : [];
    const activeThread = data.ok ? data.activeThread : null;
    const title = activeThread?.friend?.name ?? 'Чат';

    return (
        <div className="flex h-[calc(100svh-6rem)] min-h-[32rem] flex-col md:h-[calc(100svh-7rem)]">
            <PageTitle title={title} mobileBackTo={activeThread ? '/chat' : undefined}/>

            <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
                <aside className={cn('min-h-0 overflow-y-auto pr-1', activeThread && 'hidden md:block')}>
                    <div className="mb-2 px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Диалоги
                    </div>
                    {threads.length ? (
                        <div className="flex flex-col gap-1">
                            {threads.map((thread) => (
                                <ThreadButton
                                    key={thread.id}
                                    thread={thread}
                                    active={thread.id === activeThread?.id}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                            Диалогов пока нет. Откройте друга и нажмите «Написать».
                        </p>
                    )}
                </aside>

                <section className={cn('min-h-0 flex-col', activeThread ? 'flex' : 'hidden md:flex')}>
                    {activeThread ? (
                        <>
                            <div className="hidden items-center gap-3 border-b border-border/70 px-1 pb-3 md:flex">
                                <ChatAvatar user={activeThread.friend} className="size-9"/>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold">{activeThread.friend?.name ?? 'Диалог'}</div>
                                    <div className="truncate text-xs text-muted-foreground">{activeThread.friend?.email}</div>
                                </div>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-0 py-3 md:px-4">
                                {messages.length ? (
                                    <div className="flex flex-col gap-2">
                                        {messages.map((message) => (
                                            <MessageBubble key={message.id} message={message}/>
                                        ))}
                                        <div ref={bottomRef}/>
                                    </div>
                                ) : (
                                    <p className="py-16 text-center text-sm text-muted-foreground">
                                        Сообщений пока нет.
                                    </p>
                                )}
                            </div>
                            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border/70 px-0 py-3 md:px-4">
                                <Input
                                    value={text}
                                    onChange={(event) => setText(event.target.value)}
                                    placeholder="Написать сообщение..."
                                    maxLength={2000}
                                    autoComplete="off"
                                    className="rounded-full"
                                />
                                <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={isSending || !text.trim()} aria-label="Отправить">
                                    {isSending ? <Loader2 className="animate-spin"/> : <Send/>}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="grid flex-1 place-items-center px-6 text-center text-sm text-muted-foreground">
                            {data.ok ? 'Выберите диалог.' : data.error}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
