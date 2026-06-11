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

## Architecture

MovieNest is a movie-library web app: weekly/monthly top-10, latest additions, movie pages, 1–5 star ratings. Registered users (email + password) can add movies and rate them.

Single full-stack **TanStack Start** app — no separate API server. All DB access goes through server functions (`createServerFn`) in `src/server/`; the Start compiler turns them into RPC calls from the client.

- `src/server/auth.ts` — signUp / signIn / signOut / getSessionUser server fns
- `src/server/session.ts` — **server-only**: session CRUD + httpOnly cookie helpers
- `src/server/password.ts` — scrypt hashing (node:crypto, no deps)
- `src/server/movies.ts` — home lists, movie details, createMovie, rateMovie
- `src/lib/db.ts` — singleton PrismaClient
- `src/routes/` — file-based routes; `__root.tsx` `beforeLoad` puts the session user into router context (`context.user`), used by guards (`movies/new`) and UI
- `prisma/seed.ts` — demo users/movies/ratings; generates gradient SVG posters into `public/posters/`

### Ranking logic

Top-10 week/month rank by average of ratings *created in the last 7/30 days* (ties broken by count); cards display the overall average. Re-rating a movie updates the rating's `createdAt`, pushing it back into the weekly top.

### Pitfall: import protection

Plain (non-serverFn) functions that touch cookies or the DB must live in modules not reachable from client code except inside server-fn handlers (see `src/server/session.ts`). Exporting such a function from a file imported by components breaks `pnpm build` with an import-protection error.
