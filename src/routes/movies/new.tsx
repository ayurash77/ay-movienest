import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MovieForm } from '@/components/movies/MovieForm';
import { aiLookupMovie } from '@/server/ai';
import { createMovie, type MovieFormFields } from '@/server/movies';

export const Route = createFileRoute('/movies/new')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({ to: '/sign-in', search: { redirectTo: '/movies/new' } });
        }
    },
    component: NewMoviePage,
});

function NewMoviePage() {
    const navigate = useNavigate();
    const [ aiTitle, setAiTitle ] = useState('');
    const [ isLookingUp, setIsLookingUp ] = useState(false);
    const [ aiDefaults, setAiDefaults ] = useState<Partial<MovieFormFields> | null>(null);

    const handleLookup = async () => {
        const title = aiTitle.trim();
        if (title.length < 2) return;

        setIsLookingUp(true);
        try {
            const result = await aiLookupMovie({ data: { title } });
            if (!result.ok) {
                toast.error(result.error);
                return;
            }

            const movie = result.movie;
            setAiDefaults({
                title: movie.title ?? title,
                year: movie.year ?? new Date().getFullYear(),
                country: movie.country ?? '',
                description: movie.description ?? '',
                director: movie.director ?? '',
                genres: movie.genres?.join(', ') ?? '',
                starring: movie.starring?.join(', ') ?? '',
                durationMin: movie.durationMin ?? '',
                posterUrl: movie.posterUrl ?? '',
            });
            toast.success('Форма заполнена — проверьте данные перед сохранением');
        } catch {
            toast.error('Не удалось получить данные о фильме');
        } finally {
            setIsLookingUp(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <Card className="border-primary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="size-4 text-primary"/>
                        Быстрое заполнение с ИИ
                    </CardTitle>
                    <CardDescription>
                        Введите название — ИИ найдёт данные о фильме и заполнит форму. Проверьте результат перед сохранением.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleLookup();
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            value={aiTitle}
                            onChange={(e) => setAiTitle(e.target.value)}
                            placeholder="Например: Криминальное чтиво"
                            maxLength={200}
                            aria-label="Название фильма для поиска"
                        />
                        <Button type="submit" disabled={isLookingUp || aiTitle.trim().length < 2}>
                            {isLookingUp ? 'Ищем…' : 'Заполнить'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Добавить фильм</CardTitle>
                </CardHeader>
                <CardContent>
                    <MovieForm
                        key={aiDefaults ? JSON.stringify(aiDefaults) : 'empty'}
                        defaults={aiDefaults ?? undefined}
                        submitLabel="Добавить фильм"
                        onSubmit={async (fields) => {
                            const result = await createMovie({ data: fields });
                            if (result.ok) {
                                toast.success('Фильм добавлен');
                                navigate({ to: '/movies/$movieId', params: { movieId: result.movieId } });
                            } else {
                                toast.error(result.error);
                            }
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
