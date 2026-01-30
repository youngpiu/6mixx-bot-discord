/*
  Warnings:

  - You are about to drop the column `closedById` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the `TicketConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ConfessionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- DropForeignKey
ALTER TABLE "TicketConfig" DROP CONSTRAINT "TicketConfig_guildId_fkey";

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "confessionForumChannelId" TEXT,
ADD COLUMN     "confessionNotificationChannelId" TEXT,
ADD COLUMN     "confessionTutorialThreadId" TEXT,
ADD COLUMN     "donationNotificationChannelId" TEXT,
ADD COLUMN     "ticketChannelId" TEXT,
ADD COLUMN     "ticketTutorialMessageId" TEXT;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "closedById",
ADD COLUMN     "closedBy" TEXT,
ADD COLUMN     "firstMessageId" TEXT;

-- DropTable
DROP TABLE "TicketConfig";

-- CreateTable
CREATE TABLE "Confession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrls" TEXT[],
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "status" "ConfessionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "forumPostId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Confession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "donorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Confession_code_key" ON "Confession"("code");

-- CreateIndex
CREATE INDEX "Confession_guildId_idx" ON "Confession"("guildId");

-- CreateIndex
CREATE INDEX "Confession_guildId_status_idx" ON "Confession"("guildId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_code_key" ON "Donation"("code");

-- CreateIndex
CREATE INDEX "Donation_guildId_code_idx" ON "Donation"("guildId", "code");

-- CreateIndex
CREATE INDEX "Donation_guildId_status_idx" ON "Donation"("guildId", "status");

-- CreateIndex
CREATE INDEX "Donation_guildId_createdAt_idx" ON "Donation"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Donation_guildId_donorId_idx" ON "Donation"("guildId", "donorId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_code_key" ON "Expense"("code");

-- CreateIndex
CREATE INDEX "Expense_guildId_idx" ON "Expense"("guildId");

-- CreateIndex
CREATE INDEX "Expense_guildId_createdAt_idx" ON "Expense"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Member_guildId_idx" ON "Member"("guildId");

-- CreateIndex
CREATE INDEX "Member_guildId_donorCode_idx" ON "Member"("guildId", "donorCode");

-- CreateIndex
CREATE UNIQUE INDEX "Member_guildId_userId_key" ON "Member"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_authorId_fkey" FOREIGN KEY ("guildId", "authorId") REFERENCES "Member"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_approvedBy_fkey" FOREIGN KEY ("guildId", "approvedBy") REFERENCES "Member"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_guildId_donorId_fkey" FOREIGN KEY ("guildId", "donorId") REFERENCES "Member"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_guildId_confirmedBy_fkey" FOREIGN KEY ("guildId", "confirmedBy") REFERENCES "Member"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_guildId_createdBy_fkey" FOREIGN KEY ("guildId", "createdBy") REFERENCES "Member"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_requesterId_fkey" FOREIGN KEY ("guildId", "requesterId") REFERENCES "Member"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_closedBy_fkey" FOREIGN KEY ("guildId", "closedBy") REFERENCES "Member"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
