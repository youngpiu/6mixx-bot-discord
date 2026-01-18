-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PROCESSING', 'SOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('FEEDBACK', 'REPORT', 'BUG');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "solverId" TEXT,
    "type" "TicketType" NOT NULL DEFAULT 'FEEDBACK',
    "reason" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'PROCESSING',
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_threadId_key" ON "Ticket"("threadId");
