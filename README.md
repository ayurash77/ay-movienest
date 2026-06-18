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

## Деплой (Timeweb Cloud App Platform)

Репозиторий готов к деплою по Dockerfile: образ собирает приложение и на старте применяет миграции (`prisma migrate deploy`), затем поднимает сервер на порту из `EXPOSE`/`PORT` (3000).

1. **БД:** в Timeweb Cloud создать managed PostgreSQL (раздел «Базы данных»), скопировать строку подключения.
2. **Приложение:** «App Platform» → создать приложение → тип **Dockerfile** → подключить GitHub-репозиторий `ay-movienest`, ветка `main` (автодеплой по коммиту — опционально).
3. **Переменные окружения** (в панели, вкладка «Настройки»):
   - `DATABASE_URL` — строка подключения к managed PostgreSQL
   - `SESSION_SECRET` — длинная случайная строка
   - `WEB_ALLOWED_HOSTS` — необязательно; по умолчанию принимаются запросы с любым Host (норма за прокси платформы). Если задать список доменов, не забудьте включить в него и технический домен `*.twc1.net`, иначе не пройдёт healthcheck.
4. **Домен:** в панели привязать свой домен к приложению (вкладка «Домены»); если домен куплен в Timeweb — A-запись на IP приложения создаётся там же, SSL Let's Encrypt выпускается автоматически.
5. **Демо-данные** (опционально): один раз выполнить `pnpm db:seed` с `DATABASE_URL` продакшен-базы.

**Загруженные постеры:** если заданы `S3_*`, файлы сохраняются в S3-совместимое хранилище Timeweb, а в БД пишется публичный URL. Без `S3_*` локальная разработка пишет в `uploads/posters/`.

## Архитектура

Единое full-stack приложение TanStack Start — без отдельного API-сервера. Все обращения к БД идут через **server functions** (`createServerFn`), которые компилятор превращает в RPC-вызовы с клиента.

```
src/
  routes/            file-based роуты
    index.tsx        главная: топ недели / топ месяца / новинки
    movies/index     каталог «Все фильмы»: поиск + сортировка
    movies/$movieId  страница фильма: оценки, списки, комментарии
    movies/$movieId_.edit  редактирование (только добавивший фильм)
    movies/new       добавление фильма (только для авторизованных)
    my.tsx           «Мои списки»: к просмотру / просмотрено
    profile.tsx      профиль: данные и статистика пользователя
    settings.tsx     настройки: смена имени и пароля
    sign-in, sign-up вход / регистрация
    uploads.posters.$file  GET-раздача загруженных постеров (server handler)
  server/            server functions и серверная логика
    auth.ts          signUp / signIn / signOut / getSessionUser
    session.ts       сессии + cookie (server-only)
    password.ts      scrypt-хэширование
    movies.ts        списки, карточки, поиск, создание/редактирование, оценки, мои списки
    comments.ts      комментарии к фильмам
    watch.ts         статусы «к просмотру» / «просмотрено»
    profile.ts       профиль, смена имени и пароля
    uploads.ts       загрузка постеров (FormData)
    storage.ts       S3/local storage для загруженных постеров
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
