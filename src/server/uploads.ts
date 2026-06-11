import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServerFn } from '@tanstack/react-start';

import { getAuthUser } from './session';

const MAX_POSTER_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

export const uploadPoster = createServerFn({ method: 'POST' })
    .validator((data: unknown) => {
        if (!(data instanceof FormData)) {
            throw new Error('Expected FormData');
        }
        return data;
    })
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }

        const file = data.get('file');
        if (!(file instanceof File) || file.size === 0) {
            return { ok: false as const, error: 'Файл не найден' };
        }
        if (file.size > MAX_POSTER_BYTES) {
            return { ok: false as const, error: 'Файл больше 5 МБ' };
        }

        const ext = EXT_BY_MIME[file.type];
        if (!ext) {
            return { ok: false as const, error: 'Поддерживаются только JPEG, PNG и WebP' };
        }

        const name = `${randomBytes(12).toString('hex')}.${ext}`;
        const dir = join(process.cwd(), 'uploads', 'posters');
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));

        return { ok: true as const, url: `/uploads/posters/${name}` };
    });
