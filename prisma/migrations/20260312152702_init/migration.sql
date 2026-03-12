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
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
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
    "donationTutorialThreadId" TEXT,
    "donationNotificationThreadId" TEXT,
    "disbursementLogChannelId" TEXT,
    "vietnameseWordChainChannelId" TEXT,
    "englishWordChainChannelId" TEXT,
    "tempVoiceCreateChannelId" TEXT,
    "tempVoiceCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempVoiceProfile" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "channelId" TEXT,
    "sourceChannelId" TEXT,
    "name" TEXT NOT NULL,
    "limit" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TempVoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempVoiceTrustedMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TempVoiceTrustedMember_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateTable
CREATE TABLE "WordChainSession" (
    "id" BIGSERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "winnerId" TEXT,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordChainSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordChainSessionPlayer" (
    "sessionId" BIGINT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WordChainSessionPlayer_pkey" PRIMARY KEY ("sessionId","guildId","userId")
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
CREATE TABLE "EnglishWord" (
    "id" BIGSERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "firstLetter" CHAR(1) NOT NULL,
    "lastLetter" CHAR(1) NOT NULL,

    CONSTRAINT "EnglishWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Confession_guildId_idx" ON "Confession"("guildId");

-- CreateIndex
CREATE INDEX "Confession_guildId_status_idx" ON "Confession"("guildId", "status");

-- CreateIndex
CREATE INDEX "Confession_guildId_authorId_idx" ON "Confession"("guildId", "authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Confession_guildId_code_key" ON "Confession"("guildId", "code");

-- CreateIndex
CREATE INDEX "AutoIncrement_guildId_idx" ON "AutoIncrement"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoIncrement_guildId_type_key" ON "AutoIncrement"("guildId", "type");

-- CreateIndex
CREATE INDEX "Disbursement_guildId_createdAt_idx" ON "Disbursement"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_guildId_code_key" ON "Disbursement"("guildId", "code");

-- CreateIndex
CREATE INDEX "Donation_guildId_status_idx" ON "Donation"("guildId", "status");

-- CreateIndex
CREATE INDEX "Donation_guildId_createdAt_idx" ON "Donation"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Donation_guildId_donorId_idx" ON "Donation"("guildId", "donorId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_guildId_code_key" ON "Donation"("guildId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GuildSetting_guildId_key" ON "GuildSetting"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "TempVoiceProfile_channelId_key" ON "TempVoiceProfile"("channelId");

-- CreateIndex
CREATE INDEX "TempVoiceProfile_guildId_idx" ON "TempVoiceProfile"("guildId");

-- CreateIndex
CREATE INDEX "TempVoiceProfile_ownerId_idx" ON "TempVoiceProfile"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "TempVoiceProfile_guildId_ownerId_key" ON "TempVoiceProfile"("guildId", "ownerId");

-- CreateIndex
CREATE INDEX "TempVoiceTrustedMember_profileId_idx" ON "TempVoiceTrustedMember"("profileId");

-- CreateIndex
CREATE INDEX "TempVoiceTrustedMember_userId_idx" ON "TempVoiceTrustedMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TempVoiceTrustedMember_profileId_userId_key" ON "TempVoiceTrustedMember"("profileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_type_idx" ON "Ticket"("guildId", "type");

-- CreateIndex
CREATE INDEX "Ticket_guildId_status_idx" ON "Ticket"("guildId", "status");

-- CreateIndex
CREATE INDEX "Ticket_guildId_createdAt_idx" ON "Ticket"("guildId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Ticket_guildId_requesterId_idx" ON "Ticket"("guildId", "requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_guildId_code_key" ON "Ticket"("guildId", "code");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_idx" ON "GuildMember"("guildId");

-- CreateIndex
CREATE INDEX "GuildMember_userId_idx" ON "GuildMember"("userId");

-- CreateIndex
CREATE INDEX "WordChainSession_guildId_idx" ON "WordChainSession"("guildId");

-- CreateIndex
CREATE INDEX "WordChainSession_guildId_channelId_idx" ON "WordChainSession"("guildId", "channelId");

-- CreateIndex
CREATE INDEX "WordChainSessionPlayer_guildId_userId_idx" ON "WordChainSessionPlayer"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VietnamesePhrase_phrase_key" ON "VietnamesePhrase"("phrase");

-- CreateIndex
CREATE INDEX "VietnamesePhrase_firstWord_idx" ON "VietnamesePhrase"("firstWord");

-- CreateIndex
CREATE UNIQUE INDEX "EnglishWord_word_key" ON "EnglishWord"("word");

-- CreateIndex
CREATE INDEX "EnglishWord_firstLetter_idx" ON "EnglishWord"("firstLetter");

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_authorId_fkey" FOREIGN KEY ("guildId", "authorId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Confession" ADD CONSTRAINT "Confession_guildId_approvedBy_fkey" FOREIGN KEY ("guildId", "approvedBy") REFERENCES "GuildMember"("guildId", "userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoIncrement" ADD CONSTRAINT "AutoIncrement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_guildId_donorId_fkey" FOREIGN KEY ("guildId", "donorId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildSetting" ADD CONSTRAINT "GuildSetting_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempVoiceProfile" ADD CONSTRAINT "TempVoiceProfile_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempVoiceProfile" ADD CONSTRAINT "TempVoiceProfile_guildId_ownerId_fkey" FOREIGN KEY ("guildId", "ownerId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempVoiceTrustedMember" ADD CONSTRAINT "TempVoiceTrustedMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TempVoiceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempVoiceTrustedMember" ADD CONSTRAINT "TempVoiceTrustedMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempVoiceTrustedMember" ADD CONSTRAINT "TempVoiceTrustedMember_guildId_userId_fkey" FOREIGN KEY ("guildId", "userId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_requesterId_fkey" FOREIGN KEY ("guildId", "requesterId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_closedBy_fkey" FOREIGN KEY ("guildId", "closedBy") REFERENCES "GuildMember"("guildId", "userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordChainSession" ADD CONSTRAINT "WordChainSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordChainSession" ADD CONSTRAINT "WordChainSession_guildId_winnerId_fkey" FOREIGN KEY ("guildId", "winnerId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordChainSessionPlayer" ADD CONSTRAINT "WordChainSessionPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WordChainSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordChainSessionPlayer" ADD CONSTRAINT "WordChainSessionPlayer_guildId_userId_fkey" FOREIGN KEY ("guildId", "userId") REFERENCES "GuildMember"("guildId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
