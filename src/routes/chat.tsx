import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { Loader2, Paperclip, Reply, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageTitle } from '@/components/AppTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    getChatPageData,
    sendChatMessage,
    uploadChatImage,
    type ChatMessageData,
    type ChatThreadSummary,
    type ChatUser,
} from '@/server/chat';

const CHAT_IMAGE_MIME_TYPES = [ 'image/jpeg', 'image/png', 'image/webp' ];

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

function replyPreviewText(message: Pick<ChatMessageData, 'text' | 'imageUrl'>) {
    return message.text || (message.imageUrl ? 'Фото' : 'Сообщение');
}

function MessageBubble({ message, onReply }: { message: ChatMessageData; onReply: (message: ChatMessageData) => void }) {
    return (
        <div className={cn('group flex items-end gap-2', message.isMine ? 'justify-end' : 'justify-start')}>
            {message.isMine ? (
                <button
                    type="button"
                    onClick={() => onReply(message)}
                    className="mb-1 grid size-7 place-items-center rounded-full text-muted-foreground opacity-100 transition-colors hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Ответить"
                >
                    <Reply className="size-3.5"/>
                </button>
            ) : null}
            {!message.isMine ? <ChatAvatar user={message.author} className="size-7"/> : null}
            <div
                className={cn(
                    'max-w-[82%] rounded-2xl px-3 py-2 shadow-[0_8px_22px_rgb(0_0_0/0.16)]',
                    message.isMine
                        ? 'rounded-br-none bg-primary/75 text-primary-foreground'
                        : 'rounded-bl-none bg-chat-bubble text-card-foreground',
                )}
            >
                {!message.isMine ? (
                    <div className="mb-1 text-xs font-semibold text-primary">{message.author.name}</div>
                ) : null}
                {message.replyTo ? (
                    <div
                        className={cn(
                            'mb-2 max-h-16 overflow-hidden rounded-md border-l-2 px-2 py-1 text-xs',
                            message.isMine
                                ? 'border-primary-foreground/60 bg-primary-foreground/10 text-primary-foreground/85'
                                : 'border-primary bg-background/50 text-muted-foreground',
                        )}
                    >
                        <div className={cn('font-semibold', message.isMine ? 'text-primary-foreground' : 'text-foreground')}>
                            {message.replyTo.authorName}
                        </div>
                        <div>{replyPreviewText(message.replyTo)}</div>
                    </div>
                ) : null}
                {message.imageUrl ? (
                    <a
                        href={message.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-2 block overflow-hidden rounded-xl"
                    >
                        <img src={message.imageUrl} alt="" className="max-h-80 w-full object-cover"/>
                    </a>
                ) : null}
                {message.text ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed">{message.text}</p>
                ) : null}
                <div className={cn(
                    'mt-1 text-right text-[10px]',
                    message.isMine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}>
                    {message.createdAtLabel}
                </div>
            </div>
            {!message.isMine ? (
                <button
                    type="button"
                    onClick={() => onReply(message)}
                    className="mb-1 grid size-7 place-items-center rounded-full text-muted-foreground opacity-100 transition-colors hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Ответить"
                >
                    <Reply className="size-3.5"/>
                </button>
            ) : null}
        </div>
    );
}

function ChatPage() {
    const data = Route.useLoaderData();
    const router = useRouter();
    const [ text, setText ] = useState('');
    const [ replyTo, setReplyTo ] = useState<ChatMessageData | null>(null);
    const [ imageFile, setImageFile ] = useState<File | null>(null);
    const [ imagePreviewUrl, setImagePreviewUrl ] = useState<string | null>(null);
    const [ isSending, setIsSending ] = useState(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const imagePreviewRef = useRef<string | null>(null);
    const activeThreadId = data.ok ? data.activeThread?.id ?? null : null;

    const clearImageDraft = useCallback(() => {
        if (imagePreviewRef.current) {
            URL.revokeObjectURL(imagePreviewRef.current);
            imagePreviewRef.current = null;
        }
        setImageFile(null);
        setImagePreviewUrl(null);
        if (fileRef.current) fileRef.current.value = '';
    }, []);

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

    useEffect(() => {
        setReplyTo(null);
        clearImageDraft();
    }, [ activeThreadId, clearImageDraft ]);

    useEffect(() => () => clearImageDraft(), [ clearImageDraft ]);

    const handleReply = (message: ChatMessageData) => {
        setReplyTo(message);
        window.requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (!file) return;

        if (!CHAT_IMAGE_MIME_TYPES.includes(file.type)) {
            toast.error('Поддерживаются только JPEG, PNG и WebP');
            event.target.value = '';
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            toast.error('Файл больше 8 МБ');
            event.target.value = '';
            return;
        }

        clearImageDraft();
        const previewUrl = URL.createObjectURL(file);
        imagePreviewRef.current = previewUrl;
        setImageFile(file);
        setImagePreviewUrl(previewUrl);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!data.ok || !data.activeThread) return;
        const trimmed = text.trim();
        if ((!trimmed && !imageFile) || isSending) return;

        setIsSending(true);
        try {
            let imageUrl: string | undefined;
            if (imageFile) {
                const form = new FormData();
                form.set('file', imageFile);
                const uploaded = await uploadChatImage({ data: form });
                if (!uploaded.ok) {
                    toast.error(uploaded.error);
                    return;
                }
                imageUrl = uploaded.url;
            }

            const result = await sendChatMessage({
                data: {
                    threadId: data.activeThread.id,
                    text: trimmed,
                    replyToId: replyTo?.id,
                    imageUrl,
                },
            });
            if (result.ok) {
                setText('');
                setReplyTo(null);
                clearImageDraft();
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
        <div className="flex h-full min-h-0 w-full flex-1 flex-col">
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

                <section className={cn('relative min-h-0 overflow-hidden flex-col', activeThread ? 'flex' : 'hidden md:flex')}>
                    {activeThread ? (
                        <>
                            <div className="hidden items-center gap-3 border-b border-border/70 bg-background/75 px-1 pb-3 backdrop-blur-md md:flex">
                                <ChatAvatar user={activeThread.friend} className="size-9"/>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold">{activeThread.friend?.name ?? 'Диалог'}</div>
                                    <div className="truncate text-xs text-muted-foreground">{activeThread.friend?.email}</div>
                                </div>
                            </div>
                            <div
                                className={cn(
                                    'min-h-0 flex-1 overflow-y-auto px-0 pt-2 md:px-4 md:pt-3',
                                    replyTo || imagePreviewUrl ? 'pb-40' : 'pb-24',
                                )}
                            >
                                {messages.length ? (
                                    <div className="flex flex-col gap-2">
                                        {messages.map((message) => (
                                            <MessageBubble key={message.id} message={message} onReply={handleReply}/>
                                        ))}
                                        <div ref={bottomRef}/>
                                    </div>
                                ) : (
                                    <p className="py-16 text-center text-sm text-muted-foreground">
                                        Сообщений пока нет.
                                    </p>
                                )}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 z-10 px-0 pb-3 pt-8 md:px-4 md:pb-4">
                                {replyTo ? (
                                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs shadow-[0_8px_22px_rgb(0_0_0/0.14)]">
                                        <div className="min-w-0 flex-1 border-l-2 border-primary pl-2">
                                            <div className="font-semibold text-foreground">{replyTo.author.name}</div>
                                            <div className="truncate text-muted-foreground">{replyPreviewText(replyTo)}</div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setReplyTo(null)} aria-label="Отменить ответ">
                                            <X className="size-4"/>
                                        </Button>
                                    </div>
                                ) : null}
                                {imagePreviewUrl ? (
                                    <div className="mb-2 flex items-center gap-3 rounded-xl bg-card px-3 py-2 text-xs shadow-[0_8px_22px_rgb(0_0_0/0.14)]">
                                        <img src={imagePreviewUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover"/>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-foreground">Фото</div>
                                            <div className="truncate text-muted-foreground">{imageFile?.name}</div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={clearImageDraft} aria-label="Убрать фото">
                                            <X className="size-4"/>
                                        </Button>
                                    </div>
                                ) : null}
                                <form onSubmit={handleSubmit} className="flex gap-2">
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0 rounded-full bg-popover shadow-[0_10px_28px_rgb(0_0_0/0.22)] disabled:opacity-80"
                                        onClick={() => fileRef.current?.click()}
                                        disabled={isSending}
                                        aria-label="Прикрепить фото"
                                    >
                                        <Paperclip/>
                                    </Button>
                                    <Input
                                        ref={inputRef}
                                        value={text}
                                        onChange={(event) => setText(event.target.value)}
                                        placeholder="Сообщение"
                                        maxLength={2000}
                                        autoComplete="off"
                                        className="rounded-full shadow-[0_10px_28px_rgb(0_0_0/0.22)] backdrop-blur-md"
                                    />
                                    <Button type="submit" size="icon" className="shrink-0 rounded-full shadow-[0_10px_28px_rgb(0_0_0/0.24)] disabled:opacity-80" disabled={isSending || (!text.trim() && !imageFile)} aria-label="Отправить">
                                        {isSending ? <Loader2 className="animate-spin"/> : <Send/>}
                                    </Button>
                                </form>
                            </div>
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
