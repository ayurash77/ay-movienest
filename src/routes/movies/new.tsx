import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createMovie } from '@/server/movies';
import { uploadPoster } from '@/server/uploads';

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
    const [ isSubmitting, setIsSubmitting ] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);

        setIsSubmitting(true);
        try {
            let posterUrl = String(form.get('posterUrl') ?? '');
            const posterFile = form.get('posterFile');
            if (posterFile instanceof File && posterFile.size > 0) {
                const fd = new FormData();
                fd.append('file', posterFile);
                const uploaded = await uploadPoster({ data: fd });
                if (!uploaded.ok) {
                    toast.error(uploaded.error);
                    return;
                }
                posterUrl = uploaded.url;
            }

            const result = await createMovie({
                data: {
                    title: String(form.get('title') ?? ''),
                    year: Number(form.get('year') ?? 0),
                    country: String(form.get('country') ?? ''),
                    description: String(form.get('description') ?? ''),
                    posterUrl,
                    director: String(form.get('director') ?? ''),
                    genres: String(form.get('genres') ?? ''),
                    durationMin: form.get('durationMin')
                        ? Number(form.get('durationMin'))
                        : '',
                },
            });

            if (result.ok) {
                toast.success('Фильм добавлен');
                navigate({ to: '/movies/$movieId', params: { movieId: result.movieId } });
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('Проверьте правильность заполнения полей');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="mx-auto w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="text-xl">Добавить фильм</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">Название *</Label>
                        <Input id="title" name="title" required maxLength={200}/>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="year">Год *</Label>
                            <Input
                                id="year"
                                name="year"
                                type="number"
                                required
                                min={1888}
                                max={2100}
                                defaultValue={new Date().getFullYear()}
                            />
                        </div>
                        <div className="flex flex-col gap-2 sm:col-span-2">
                            <Label htmlFor="country">Страна *</Label>
                            <Input id="country" name="country" required maxLength={100}/>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="description">Описание *</Label>
                        <Textarea id="description" name="description" required rows={5} maxLength={5000}/>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="director">Режиссёр</Label>
                            <Input id="director" name="director" maxLength={200}/>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="durationMin">Длительность, мин</Label>
                            <Input id="durationMin" name="durationMin" type="number" min={1} max={1000}/>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="genres">Жанры (через запятую)</Label>
                        <Input id="genres" name="genres" placeholder="драма, триллер" maxLength={300}/>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="posterFile">Постер (JPEG/PNG/WebP, до 5 МБ)</Label>
                            <Input
                                id="posterFile"
                                name="posterFile"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-0.5 file:text-xs file:text-secondary-foreground"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="posterUrl">…или ссылка на постер</Label>
                            <Input id="posterUrl" name="posterUrl" type="url" placeholder="https://..."/>
                        </div>
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="self-end">
                        {isSubmitting ? 'Сохранение…' : 'Добавить фильм'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
