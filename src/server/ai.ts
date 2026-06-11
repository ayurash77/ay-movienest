import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { getAuthUser } from './session';

const lookupResultSchema = z.object({
    found: z.boolean(),
    title: z.string().nullish(),
    originalTitle: z.string().nullish(),
    year: z.number().int().nullish(),
    country: z.string().nullish(),
    description: z.string().nullish(),
    director: z.string().nullish(),
    genres: z.array(z.string()).nullish(),
    starring: z.array(z.string()).nullish(),
    durationMin: z.number().int().nullish(),
});

export type AiMovieLookup = z.infer<typeof lookupResultSchema>;

const SYSTEM_PROMPT = [
    'Ты — справочник по кино для русскоязычной библиотеки фильмов.',
    'Пользователь присылает название фильма. Верни достоверные данные об этом фильме.',
    'Правила:',
    '- title: официальное русское название (если есть прокатное), иначе оригинальное.',
    '- originalTitle: оригинальное название фильма (на языке производства).',
    '- year: год премьеры.',
    '- country: основная страна производства на русском (если несколько — перечисли через запятую, максимум три).',
    '- description: 3–5 предложений на русском, без спойлеров и оценок, нейтральный энциклопедический тон.',
    '- director: имя режиссёра в русской транскрипции.',
    '- genres: 1–4 жанра на русском в нижнем регистре.',
    '- starring: 3–6 главных актёров в русской транскрипции.',
    '- durationMin: длительность в минутах.',
    'Если фильм неизвестен, данных недостаточно или название слишком неоднозначно — верни found: false и не выдумывай данные.',
    'Если по названию подходит несколько фильмов, выбери самый известный.',
].join('\n');

// Ищем постер в инфобоксе статьи Википедии (pilicense=any включает
// несвободные изображения — постеры почти всегда такие)
async function wikiPoster(lang: string, search: string): Promise<string | null> {
    const url =
        `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search` +
        `&gsrsearch=${encodeURIComponent(search)}&gsrlimit=1` +
        `&prop=pageimages&piprop=thumbnail&pithumbsize=600&pilicense=any&format=json`;

    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(5000),
            headers: { 'user-agent': 'MovieNest/1.0 (movie library; poster lookup)' },
        });
        if (!res.ok) return null;
        const json = (await res.json()) as {
            query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
        };
        for (const page of Object.values(json.query?.pages ?? {})) {
            if (page.thumbnail?.source) return page.thumbnail.source;
        }
    } catch {
        // сеть/таймаут — просто остаёмся без постера
    }
    return null;
}

async function findPosterUrl(movie: AiMovieLookup): Promise<string | null> {
    const attempts: Array<[ string, string ]> = [];
    if (movie.title) {
        attempts.push([ 'ru', `${movie.title} (фильм)` ], [ 'ru', `${movie.title} фильм ${movie.year ?? ''}` ]);
    }
    if (movie.originalTitle) {
        attempts.push([ 'en', `${movie.originalTitle} (film)` ], [ 'en', `${movie.originalTitle} film ${movie.year ?? ''}` ]);
    }

    for (const [ lang, search ] of attempts) {
        const poster = await wikiPoster(lang, search.trim());
        if (poster) return poster;
    }
    return null;
}

export const aiLookupMovie = createServerFn({ method: 'POST' })
    .validator(z.object({ title: z.string().trim().min(2).max(200) }))
    .handler(async ({ data }) => {
        const user = await getAuthUser();
        if (!user) {
            return { ok: false as const, error: 'Требуется авторизация' };
        }
        if (!process.env.OPENAI_API_KEY) {
            return { ok: false as const, error: 'OPENAI_API_KEY не настроен на сервере' };
        }

        const [ { chat }, { openaiText } ] = await Promise.all([
            import('@tanstack/ai'),
            import('@tanstack/ai-openai'),
        ]);

        try {
            const result = await chat({
                adapter: openaiText(
                    (process.env.OPENAI_MODEL || 'gpt-5.2') as Parameters<typeof openaiText>[0],
                    // OPENAI_BASE_URL позволяет ходить через OpenAI-совместимый
                    // прокси (нужно, если регион хостинга заблокирован OpenAI)
                    process.env.OPENAI_BASE_URL
                        ? { baseURL: process.env.OPENAI_BASE_URL }
                        : undefined,
                ),
                systemPrompts: [ SYSTEM_PROMPT ],
                messages: [ { role: 'user', content: `Название фильма: ${data.title}` } ],
                outputSchema: lookupResultSchema,
                temperature: 0.1,
                maxTokens: 1500,
            });

            if (!result.found) {
                return {
                    ok: false as const,
                    error: 'Не удалось найти информацию об этом фильме — проверьте название',
                };
            }

            const posterUrl = await findPosterUrl(result);

            return { ok: true as const, movie: { ...result, posterUrl } };
        } catch (error) {
            console.error('aiLookupMovie failed:', error);
            const message = error instanceof Error ? error.message : String(error);

            if (/unsupported_country|country.+not supported|403/i.test(message)) {
                return {
                    ok: false as const,
                    error: 'OpenAI блокирует запросы из региона сервера — нужен прокси (OPENAI_BASE_URL)',
                };
            }
            if (/401|invalid_api_key|incorrect api key/i.test(message)) {
                return { ok: false as const, error: 'Неверный OPENAI_API_KEY на сервере' };
            }
            if (/429|quota|rate limit/i.test(message)) {
                return { ok: false as const, error: 'Превышен лимит OpenAI — попробуйте позже' };
            }

            return { ok: false as const, error: 'Сервис ИИ временно недоступен, попробуйте позже' };
        }
    });
