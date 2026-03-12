-- RenameTable
ALTER TABLE "VietnameseWordChainSessionPlayer" RENAME TO "WordChainSessionPlayer";

-- RenameTable
ALTER TABLE "VietnameseWordChainSession" RENAME TO "WordChainSession";

-- RenameIndex
ALTER INDEX "VietnameseWordChainSession_guildId_idx" RENAME TO "WordChainSession_guildId_idx";

-- RenameIndex
ALTER INDEX "VietnameseWordChainSession_guildId_channelId_idx" RENAME TO "WordChainSession_guildId_channelId_idx";

-- RenameIndex
ALTER INDEX "VietnameseWordChainSession_pkey" RENAME TO "WordChainSession_pkey";

-- RenameIndex
ALTER INDEX "VietnameseWordChainSessionPlayer_guildId_memberId_idx" RENAME TO "WordChainSessionPlayer_guildId_memberId_idx";

-- RenameIndex
ALTER INDEX "VietnameseWordChainSessionPlayer_pkey" RENAME TO "WordChainSessionPlayer_pkey";

-- RenameForeignKey
ALTER TABLE "WordChainSession" RENAME CONSTRAINT "VietnameseWordChainSession_guildId_fkey" TO "WordChainSession_guildId_fkey";

-- RenameForeignKey
ALTER TABLE "WordChainSession" RENAME CONSTRAINT "VietnameseWordChainSession_guildId_winnerId_fkey" TO "WordChainSession_guildId_winnerId_fkey";

-- RenameForeignKey
ALTER TABLE "WordChainSessionPlayer" RENAME CONSTRAINT "VietnameseWordChainSessionPlayer_sessionId_fkey" TO "WordChainSessionPlayer_sessionId_fkey";

-- RenameForeignKey
ALTER TABLE "WordChainSessionPlayer" RENAME CONSTRAINT "VietnameseWordChainSessionPlayer_guildId_memberId_fkey" TO "WordChainSessionPlayer_guildId_memberId_fkey";
