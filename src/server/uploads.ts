import { createServerFn } from '@tanstack/react-start';

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
        const { getAuthUser } = await import('./session');
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

        try {
            const { storeUpload } = await import('./storage');
            const { url } = await storeUpload(
                'posters',
                ext,
                Buffer.from(await file.arrayBuffer()),
                file.type,
            );
            return { ok: true as const, url };
        } catch {
            return { ok: false as const, error: 'Не удалось сохранить файл' };
        }
    });
