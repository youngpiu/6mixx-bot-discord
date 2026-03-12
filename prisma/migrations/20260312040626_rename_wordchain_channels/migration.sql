/*
  Warnings:

  - You are about to drop the column `wordChainChannelId` on the `GuildSetting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GuildSetting" DROP COLUMN "wordChainChannelId",
ADD COLUMN     "englishWordChainChannelId" TEXT,
ADD COLUMN     "vietnameseWordChainChannelId" TEXT;
