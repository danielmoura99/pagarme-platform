/*
  Warnings:

  - You are about to drop the column `courseName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `educationalIds` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `ProductAccess` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductAccess" DROP CONSTRAINT "ProductAccess_customerId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAccess" DROP CONSTRAINT "ProductAccess_orderId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAccess" DROP CONSTRAINT "ProductAccess_productId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "courseName",
DROP COLUMN "educationalIds";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "productAccesses";

-- DropTable
DROP TABLE "ProductAccess";
