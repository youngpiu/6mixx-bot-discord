/*
  Warnings:

  - You are about to drop the column `solvedAt` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `solverId` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Ticket` table. All the data in the column will be lost.
  - Made the column `threadId` on table `Ticket` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "solvedAt",
DROP COLUMN "solverId",
DROP COLUMN "status",
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT,
ALTER COLUMN "threadId" SET NOT NULL;

-- DropEnum
DROP TYPE "TicketStatus";
