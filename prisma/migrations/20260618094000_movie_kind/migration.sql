CREATE TYPE "MovieKind" AS ENUM ('MOVIE', 'SERIES', 'CARTOON');

ALTER TABLE "Movie"
    ADD COLUMN "kind" "MovieKind" NOT NULL DEFAULT 'MOVIE';

CREATE INDEX "Movie_kind_createdAt_idx" ON "Movie"("kind", "createdAt");
