/*
  Warnings:

  - A unique constraint covering the columns `[recipientId]` on the table `Affiliate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Affiliate" ADD COLUMN     "recipientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_recipientId_key" ON "Affiliate"("recipientId");
