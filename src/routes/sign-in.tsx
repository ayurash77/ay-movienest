import { useState } from 'react';
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/server/auth';

export const Route = createFileRoute('/sign-in')({
    validateSearch: z.object({
        redirectTo: z.string().optional(),
    }),
    component: SignInPage,
});

function SignInPage() {
    const router = useRouter();
    const navigate = useNavigate();
    const { redirectTo } = Route.useSearch();
    const [ isSubmitting, setIsSubmitting ] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);

        setIsSubmitting(true);
        try {
            const result = await signIn({
                data: {
                    email: String(form.get('email') ?? ''),
                    password: String(form.get('password') ?? ''),
                },
            });

            if (result.ok) {
                await router.invalidate();
                navigate({ to: redirectTo ?? '/' });
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('Не удалось войти. Проверьте данные.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="mx-auto mt-10 w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-xl">Вход</CardTitle>
                <CardDescription>Войдите, чтобы оценивать и добавлять фильмы</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required autoComplete="email"/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="password">Пароль</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Вход…' : 'Войти'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        Нет аккаунта?{' '}
                        <Link to="/sign-up" className="text-primary hover:underline">
                            Зарегистрироваться
                        </Link>
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}
