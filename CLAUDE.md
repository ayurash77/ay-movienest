# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server, port 3002
pnpm build        # production build
pnpm typecheck    # tsc --noEmit

pnpm dc:up        # start PostgreSQL 18 in Docker (host port 5434)
pnpm db:push      # sync Prisma schema to DB (dev, no migration)
pnpm db:migrate:dev # create and apply a named migration
pnpm db:generate  # regenerate Prisma client after schema changes
pnpm db:seed      # wipe DB and reseed demo data (also regenerates SVG posters)
pnpm db:studio    # Prisma Studio
```

Env lives in `.env` (copy from `.env.example`). Postgres uses host port **5434** because 5432/5433 are taken by other local projects.

Schema changes go through migrations now (`prisma/migrations/`, baseline `0_init`): use `pnpm db:migrate:dev`, not bare `db:push`, so production (`prisma migrate deploy` in the Docker CMD) stays in sync.

## Deployment

Deployed to Timeweb Cloud App Platform from the GitHub repo via the root `Dockerfile` (port 3000 via `EXPOSE`). Runtime env vars set in the panel: `DATABASE_URL` (managed PostgreSQL), `SESSION_SECRET`, `WEB_ALLOWED_HOSTS` (production domain; consumed by `preview.allowedHosts` in vite.config.ts), and `S3_*` vars for Timeweb object storage. Container FS is ephemeral, so production poster uploads should use S3.

## Architecture

MovieNest is a movie-library web app for movies, series, and cartoons: grouped card catalogue, movie pages, comments, watch lists, and 1–5 star ratings. Registered users (email + password) can add entries and rate them.

Single full-stack **TanStack Start** app — no separate API server. All DB access goes through server functions (`createServerFn`) in `src/server/`; the Start compiler turns them into RPC calls from the client.

- `src/server/auth.ts` — signUp / signIn / signOut / getSessionUser server fns
- `src/server/session.ts` — **server-only**: session CRUD + httpOnly cookie helpers
- `src/server/password.ts` — scrypt hashing (node:crypto, no deps)
- `src/server/movies.ts` — grouped catalogue data, movie details, searchMovies, createMovie/updateMovie, rateMovie, watch lists
- `src/server/movie-lookup.ts` — no-token quick form fill via Wikipedia/Wikidata, including poster thumbnail and best-effort kind/country/director/cast metadata
- `src/server/uploads.ts` — poster file upload (FormData server fn); delegates persistence to `src/server/storage.ts`
- `src/server/storage.ts` — storage abstraction with two backends, selected by env: **s3** (uploads to an S3-compatible bucket, returns the public object URL) when `S3_*` vars are set, else **local** (writes to `uploads/posters/`, served by `src/routes/uploads.posters.$file.tsx`)
- `src/lib/db.ts` — singleton PrismaClient
- `src/routes/` — file-based routes; `__root.tsx` `beforeLoad` puts the session user into router context (`context.user`), used by guards (`movies/new`) and UI
- `prisma/seed.ts` — demo users/movies/ratings; generates gradient SVG posters into `public/posters/`

### Catalogue logic

Cards default to two grouping levels: domestic/foreign and then country. The client can disable either grouping and hide countries. `Movie.kind` separates movies, series, and cartoons; the migration defaults existing rows to `MOVIE`.

### Pitfall: import protection

Plain (non-serverFn) functions that touch cookies or the DB must live in modules not reachable from client code except inside server-fn handlers (see `src/server/session.ts`). Exporting such a function from a file imported by components breaks `pnpm build` with an import-protection error.
