import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { getAuthUser } from './session';

const lookupResultSchema = z.object({
    found: z.boolean(),
    title: z.string().nullish(),
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

            return { ok: true as const, movie: result };
        } catch (error) {
            console.error('aiLookupMovie failed:', error);
            return { ok: false as const, error: 'Сервис ИИ временно недоступен, попробуйте позже' };
        }
    });
