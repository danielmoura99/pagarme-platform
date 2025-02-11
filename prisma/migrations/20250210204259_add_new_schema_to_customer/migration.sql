/*
  Warnings:

  - You are about to drop the column `userId` on the `Customer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[document]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- DropIndex
DROP INDEX "Customer_userId_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "userId",
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_document_key" ON "Customer"("document");
