import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MovieForm } from '@/components/movies/MovieForm';
import { createMovie } from '@/server/movies';

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

    return (
        <Card className="mx-auto w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="text-xl">Добавить фильм</CardTitle>
            </CardHeader>
            <CardContent>
                <MovieForm
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
    );
}
