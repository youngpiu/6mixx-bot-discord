-- AlterTable
ALTER TABLE "GuildSetting" ADD COLUMN     "nmixxQuizAnswerChannelId" TEXT,
ADD COLUMN     "nmixxQuizVoiceChannelId" TEXT;

-- CreateTable
CREATE TABLE "MusicQuizSong" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "aliases" TEXT[],
    "singer" TEXT NOT NULL,
    "album" TEXT,
    "opusUrl" TEXT NOT NULL,
    "songUrl" TEXT,
    "thumbUrl" TEXT,
    "duration" INTEGER,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "avgGuessTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestGuessTime" DOUBLE PRECISION,
    "bestGuesserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicQuizSong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MusicQuizSong_opusUrl_key" ON "MusicQuizSong"("opusUrl");

-- AddForeignKey
ALTER TABLE "MusicQuizSong" ADD CONSTRAINT "MusicQuizSong_bestGuesserId_fkey" FOREIGN KEY ("bestGuesserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
