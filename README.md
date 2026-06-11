# MovieNest

Веб-библиотека фильмов: рейтинги (топ-10 недели, топ-10 месяца, новинки), карточки фильмов, страницы с подробной информацией. Зарегистрированные пользователи могут добавлять фильмы и выставлять оценки (1–5 звёзд).

## Стек

- **TanStack Start** (React 19, file-based routing, SSR, server functions)
- **PostgreSQL 18** в Docker + **Prisma**
- **TailwindCSS 4** + Radix-примитивы (shadcn-стиль)
- Авторизация: email + пароль (scrypt), сессии в БД, httpOnly-cookie

## Запуск

```bash
cp .env.example .env      # при необходимости поправьте порты/секреты
pnpm install
pnpm dc:up                # PostgreSQL в Docker (порт 5434)
pnpm db:push              # синхронизация схемы Prisma
pnpm db:seed              # демо-данные (фильмы, пользователи, оценки)
pnpm dev                  # http://localhost:3002
```

Демо-вход: `demo@movienest.dev` / `demo123` (а также anna@, boris@, vera@, gleb@, dasha@ — пароль тот же).

## Команды

```bash
pnpm dev          # dev-сервер (порт 3002)
pnpm build        # production-сборка
pnpm preview      # запуск собранного приложения
pnpm typecheck    # проверка типов

pnpm dc:up        # старт PostgreSQL в Docker
pnpm dc:down      # стоп контейнеров

pnpm db:push      # синхронизировать схему с БД (dev)
pnpm db:migrate:dev  # создать и применить миграцию
pnpm db:generate  # перегенерировать Prisma client
pnpm db:studio    # Prisma Studio
pnpm db:seed      # пересеять демо-данные (очищает БД!)
```

## Архитектура

Единое full-stack приложение TanStack Start — без отдельного API-сервера. Все обращения к БД идут через **server functions** (`createServerFn`), которые компилятор превращает в RPC-вызовы с клиента.

```
src/
  routes/            file-based роуты
    index.tsx        главная: топ недели / топ месяца / новинки
    movies/$movieId  страница фильма + выставление оценки
    movies/new       добавление фильма (только для авторизованных)
    sign-in, sign-up вход / регистрация
  server/            server functions и серверная логика
    auth.ts          signUp / signIn / signOut / getSessionUser
    session.ts       сессии + cookie (server-only)
    password.ts      scrypt-хэширование
    movies.ts        списки, карточки, создание, оценки
  components/        UI-кит (ui/) и доменные компоненты (movies/)
  lib/db.ts          singleton PrismaClient
prisma/
  schema.prisma      User, Session, Movie, Rating
  seed.ts            демо-данные + генерация SVG-постеров в public/posters/
```

### Логика рейтингов

- **Топ-10 недели/месяца** — фильмы ранжируются по средней оценке среди оценок, выставленных за последние 7/30 дней (при равенстве — по числу оценок). На карточке при этом показывается общий средний рейтинг фильма.
- **Новинки** — 5 последних добавленных фильмов.
- Оценка пользователя — upsert: повторная оценка заменяет старую и обновляет её дату (фильм снова участвует в недельном топе).

### Важно: server-only код

Функции, использующие куки/БД напрямую (не через `createServerFn`), должны жить в модулях, которые не импортируются клиентским кодом нигде, кроме как внутри handler'ов server functions (`src/server/session.ts`) — иначе сборка падает с ошибкой import protection.
