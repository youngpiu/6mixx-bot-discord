-- CreateTable
CREATE TABLE "LastFmAccount" (
    "userId" TEXT NOT NULL,
    "lastfmUsername" TEXT NOT NULL,
    "totalScrobbles" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastFmAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LastFmUserArtistLibrary" (
    "userId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "playCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastFmUserArtistLibrary_pkey" PRIMARY KEY ("userId","artistName")
);

-- CreateIndex
CREATE UNIQUE INDEX "LastFmAccount_lastfmUsername_key" ON "LastFmAccount"("lastfmUsername");

-- CreateIndex
CREATE INDEX "LastFmUserArtistLibrary_artistName_idx" ON "LastFmUserArtistLibrary"("artistName");

-- AddForeignKey
ALTER TABLE "LastFmAccount" ADD CONSTRAINT "LastFmAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
