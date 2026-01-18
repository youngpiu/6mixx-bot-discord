/*
  Warnings:

  - Added the required column `tutorialMessageId` to the `TicketConfig` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TicketConfig" ADD COLUMN     "tutorialMessageId" TEXT NOT NULL DEFAULT '123';
