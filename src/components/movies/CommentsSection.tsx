import { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addComment, deleteComment, type MovieComment } from '@/server/comments';

function formatCommentDate(iso: string) {
    const d = new Date(iso);
    return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

type CommentsSectionProps = {
    movieId: string;
    comments: MovieComment[];
    isAuthed: boolean;
};

export function CommentsSection({ movieId, comments, isAuthed }: CommentsSectionProps) {
    const router = useRouter();
    const [ text, setText ] = useState('');
    const [ isSubmitting, setIsSubmitting ] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        setIsSubmitting(true);
        try {
            const result = await addComment({ data: { movieId, text: trimmed } });
            if (result.ok) {
                setText('');
                await router.invalidate();
            } else {
                toast.error(result.error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        const result = await deleteComment({ data: { commentId } });
        if (result.ok) {
            await router.invalidate();
        } else {
            toast.error(result.error);
        }
    };

    return (
        <section className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold">
                <MessageSquare className="size-5 text-primary"/>
                Комментарии
                <span className="text-base font-normal text-muted-foreground">{comments.length}</span>
            </h2>

            {isAuthed ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                    <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Поделитесь впечатлениями о фильме…"
                        rows={3}
                        maxLength={2000}
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isSubmitting || !text.trim()}
                        className="self-end"
                    >
                        {isSubmitting ? 'Отправка…' : 'Отправить'}
                    </Button>
                </form>
            ) : (
                <p className="text-sm text-muted-foreground">
                    <Link to="/sign-in" className="text-primary hover:underline">
                        Войдите
                    </Link>
                    , чтобы оставить комментарий
                </p>
            )}

            {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Комментариев пока нет — будьте первым!</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {comments.map((comment) => (
                        <li key={comment.id} className="rounded-xl border border-border bg-card p-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{comment.authorName}</span>
                                <span>{formatCommentDate(comment.createdAt)}</span>
                                {comment.isMine ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(comment.id)}
                                        aria-label="Удалить комментарий"
                                    >
                                        <Trash2 className="size-3.5"/>
                                    </Button>
                                ) : null}
                            </div>
                            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{comment.text}</p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
