import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from './password';
import { createSession, destroySession, getAuthUser } from './session';

export type { SessionUser } from './session';

export const getSessionUser = createServerFn({ method: 'GET' }).handler(
    async () => getAuthUser(),
);

const signUpSchema = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    name: z.string().trim().min(1).max(100),
    password: z.string().min(6).max(200),
});

export const signUp = createServerFn({ method: 'POST' })
    .validator(signUpSchema)
    .handler(async ({ data }) => {
        const existing = await db.user.findUnique({ where: { email: data.email } });
        if (existing) {
            return { ok: false as const, error: 'Пользователь с таким email уже зарегистрирован' };
        }

        const user = await db.user.create({
            data: {
                email: data.email,
                name: data.name,
                passwordHash: hashPassword(data.password),
            },
        });

        await createSession(user.id);

        return { ok: true as const };
    });

const signInSchema = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(1),
});

export const signIn = createServerFn({ method: 'POST' })
    .validator(signInSchema)
    .handler(async ({ data }) => {
        const user = await db.user.findUnique({ where: { email: data.email } });
        if (!user || !verifyPassword(data.password, user.passwordHash)) {
            return { ok: false as const, error: 'Неверный email или пароль' };
        }

        await createSession(user.id);

        return { ok: true as const };
    });

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
    await destroySession();
    return { ok: true as const };
});
