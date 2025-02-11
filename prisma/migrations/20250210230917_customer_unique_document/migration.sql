/*
  Warnings:

  - A unique constraint covering the columns `[document]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Made the column `document` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Customer_email_document_key";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "document" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_document_key" ON "Customer"("document");
