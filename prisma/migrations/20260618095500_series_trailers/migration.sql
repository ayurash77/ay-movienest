ALTER TABLE "Movie"
    ADD COLUMN "trailerUrl" TEXT,
    ADD COLUMN "seasonsCount" INTEGER,
    ADD COLUMN "episodesPerSeason" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
