# CLAUDE.md

Канонический контекст проекта находится в [AGENTS.md](./AGENTS.md).

Для работы в конкретных зонах смотри также:
- [src/server/AGENTS.md](./src/server/AGENTS.md)
- [src/routes/AGENTS.md](./src/routes/AGENTS.md)

Кратко:
- отвечать пользователю по-русски, коротко и по делу;
- schema changes делать через `pnpm db:migrate:dev`;
- после законченной задачи делать коммит и `git push origin main`, если пользователь не сказал иначе;
- server-only imports держать внутри `createServerFn().handler(...)` или server route handlers;
- после изменений на границе server/client запускать `pnpm build`.
