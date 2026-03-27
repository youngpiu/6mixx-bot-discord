-- CreateTable
CREATE TABLE "TempVoiceDeniedMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TempVoiceDeniedMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TempVoiceDeniedMember_profileId_idx" ON "TempVoiceDeniedMember"("profileId");

-- CreateIndex
CREATE INDEX "TempVoiceDeniedMember_userId_idx" ON "TempVoiceDeniedMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TempVoiceDeniedMember_profileId_userId_key" ON "TempVoiceDeniedMember"("profileId", "userId");

-- AddForeignKey
ALTER TABLE "TempVoiceDeniedMember" ADD CONSTRAINT "TempVoiceDeniedMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TempVoiceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempVoiceDeniedMember" ADD CONSTRAINT "TempVoiceDeniedMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempVoiceDeniedMember" ADD CONSTRAINT "TempVoiceDeniedMember_guildId_userId_fkey" FOREIGN KEY ("guildId", "userId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
