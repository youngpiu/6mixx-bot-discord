-- CreateEnum
CREATE TYPE "ConfessionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'PENDING_VERIFICATION', 'TRANSFERRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('FEEDBACK', 'REPORT', 'BUG');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Confession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "status" "ConfessionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "forumPostId" TEXT,
    "authorId" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Confession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoIncrement" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoIncrement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "messageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "donorId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishWord" (
    "id" BIGSERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "firstLetter" CHAR(1) NOT NULL,
    "lastLetter" CHAR(1) NOT NULL,

    CONSTRAINT "EnglishWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("guildId","id")
);

-- CreateTable
CREATE TABLE "GuildSetting" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "serviceForumChannelId" TEXT,
    "notificationForumChannelId" TEXT,
    "errorNotificationThreadId" TEXT,
    "ticketCategoryId" TEXT,
    "ticketTutorialThreadId" TEXT,
    "ticketNotificationThreadId" TEXT,
    "confessionForumChannelId" TEXT,
    "confessionTutorialThreadId" TEXT,
    "confessionNotificationThreadId" TEXT,
    "confessionCounter" INTEGER NOT NULL DEFAULT 1,
    "donationTutorialThreadId" TEXT,
    "donationNotificationThreadId" TEXT,
    "disbursementLogChannelId" TEXT,
    "wordChainChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "type" "TicketType" NOT NULL DEFAULT 'FEEDBACK',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "closedAt" TIMESTAMP(3),
    "requesterId" TEXT NOT NULL,
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietnamesePhrase" (
    "id" BIGSERIAL NOT NULL,
    "phrase" TEXT NOT NULL,
    "firstWord" TEXT NOT NULL,
    "lastWord" TEXT NOT NULL,

    CONSTRAINT "VietnamesePhrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietnameseWordChainSession" (
    "id" BIGSERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "winnerId" TEXT,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VietnameseWordChainSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietnameseWordChainSessionPlayer" (
    "sessionId" BIGINT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VietnameseWordChainSessionPlayer_pkey" PRIMARY KEY ("sessionId","guildId","memberId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Confession_code_key" ON "Confession"("code");

-- CreateIndex
CREATE INDEX "Confession_guildId_idx" ON "Confession"("guildId");

-- CreateIndex
CREATE INDEX "Confession_guildId_status_idx" ON "Confession"("guildId", "status");

-- CreateIndex
CREATE INDEX "AutoIncrement_guildId_idx" ON "AutoIncrement"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoIncrement_guildId_type_key" ON "AutoIncrement"("guildId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_code_key" ON "Disbursement"("code");

-- CreateIndex
CREATE INDEX "Disbursement_guildId_code_idx" ON "Disbursement"("guildId", "code");

-- CreateIndex
CREATE INDEX "Disbursement_guildId_createdAt_idx" ON "Disbursement"("guildId", "createdAt" DESC);

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
CREATE UNIQUE INDEX "EnglishWord_word_key" ON "EnglishWord"("word");

-- CreateIndex
CREATE INDEX "EnglishWord_firstLetter_idx" ON "EnglishWord"("firstLetter");

-- CreateIndex
CREATE INDEX "Member_guildId_idx" ON "Member"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildSetting_guildId_key" ON "GuildSetting"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_type_idx" ON "Ticket"("guildId", "type");

-- CreateIndex
CREATE INDEX "Ticket_guildId_code_idx" ON "Ticket"("guildId", "code");

-- CreateIndex
CREATE INDEX "Ticket_guildId_status_idx" ON "Ticket"("guildId", "status");

-- CreateIndex
CREATE INDEX "Ticket_guildId_createdAt_idx" ON "Ticket"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "VietnamesePhrase_phrase_key" ON "VietnamesePhrase"("phrase");

-- CreateIndex
CREATE INDEX "VietnamesePhrase_firstWord_idx" ON "VietnamesePhrase"("firstWord");

-- CreateIndex
CREATE INDEX "VietnameseWordChainSession_guildId_idx" ON "VietnameseWordChainSession"("guildId");

-- CreateIndex
CREATE INDEX "VietnameseWordChainSession_guildId_channelId_idx" ON "VietnameseWordChainSession"("guildId", "channelId");

-- CreateIndex
CREATE INDEX "VietnameseWordChainSessionPlayer_guildId_memberId_idx" ON "VietnameseWordChainSessionPlayer"("guildId", "memberId");

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_authorId_fkey" FOREIGN KEY ("guildId", "authorId") REFERENCES "Member"("guildId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_approvedBy_fkey" FOREIGN KEY ("guildId", "approvedBy") REFERENCES "Member"("guildId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoIncrement" ADD CONSTRAINT "AutoIncrement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_guildId_donorId_fkey" FOREIGN KEY ("guildId", "donorId") REFERENCES "Member"("guildId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildSetting" ADD CONSTRAINT "GuildSetting_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_requesterId_fkey" FOREIGN KEY ("guildId", "requesterId") REFERENCES "Member"("guildId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_closedBy_fkey" FOREIGN KEY ("guildId", "closedBy") REFERENCES "Member"("guildId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietnameseWordChainSession" ADD CONSTRAINT "VietnameseWordChainSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietnameseWordChainSession" ADD CONSTRAINT "VietnameseWordChainSession_guildId_winnerId_fkey" FOREIGN KEY ("guildId", "winnerId") REFERENCES "Member"("guildId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietnameseWordChainSessionPlayer" ADD CONSTRAINT "VietnameseWordChainSessionPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VietnameseWordChainSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietnameseWordChainSessionPlayer" ADD CONSTRAINT "VietnameseWordChainSessionPlayer_guildId_memberId_fkey" FOREIGN KEY ("guildId", "memberId") REFERENCES "Member"("guildId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
