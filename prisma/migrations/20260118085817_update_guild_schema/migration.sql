/*
  Warnings:

  - A unique constraint covering the columns `[guildId]` on the table `Guild` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guildId` to the `Guild` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Guild` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TicketConfig` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TicketConfig" DROP CONSTRAINT "TicketConfig_guildId_fkey";

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "guildId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TicketConfig" ADD COLUMN     "allowedRoles" TEXT[],
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Guild_guildId_key" ON "Guild"("guildId");

-- AddForeignKey
ALTER TABLE "TicketConfig" ADD CONSTRAINT "TicketConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
