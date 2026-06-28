ALTER TABLE "User"
    ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

UPDATE "User"
SET "role" = 'ADMIN'
WHERE lower("email") = 'ayurash@me.com';

CREATE TABLE "UserFriend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFriend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFriend_userId_friendId_key" ON "UserFriend"("userId", "friendId");
CREATE INDEX "UserFriend_userId_createdAt_idx" ON "UserFriend"("userId", "createdAt");
CREATE INDEX "UserFriend_friendId_idx" ON "UserFriend"("friendId");

ALTER TABLE "UserFriend"
    ADD CONSTRAINT "UserFriend_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserFriend"
    ADD CONSTRAINT "UserFriend_friendId_fkey"
    FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
