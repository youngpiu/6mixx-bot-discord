/*
  Warnings:

  - You are about to drop the `CustomRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VipStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CustomRole" DROP CONSTRAINT "CustomRole_guildId_userId_fkey";

-- DropForeignKey
ALTER TABLE "VipStatus" DROP CONSTRAINT "VipStatus_guildId_userId_fkey";

-- DropTable
DROP TABLE "CustomRole";

-- DropTable
DROP TABLE "VipStatus";

-- CreateTable
CREATE TABLE "VipRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VipType" NOT NULL,
    "expireAt" TIMESTAMP(3),
    "roleId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VipRole_roleId_key" ON "VipRole"("roleId");

-- CreateIndex
CREATE INDEX "VipRole_guildId_idx" ON "VipRole"("guildId");

-- CreateIndex
CREATE INDEX "VipRole_expireAt_idx" ON "VipRole"("expireAt");

-- CreateIndex
CREATE INDEX "VipRole_deletedAt_idx" ON "VipRole"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VipRole_guildId_userId_key" ON "VipRole"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "VipRole" ADD CONSTRAINT "VipRole_guildId_userId_fkey" FOREIGN KEY ("guildId", "userId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
