/*
  Warnings:

  - The primary key for the `_CouponToProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_CouponToProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_CouponToProduct" DROP CONSTRAINT "_CouponToProduct_AB_pkey";

-- CreateTable
CREATE TABLE "checkout_settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "checkoutTitle" TEXT NOT NULL,
    "checkoutDescription" TEXT NOT NULL,
    "successMessage" TEXT NOT NULL,
    "termsAndConditionsUrl" TEXT,
    "privacyPolicyUrl" TEXT,
    "showInstallments" BOOLEAN NOT NULL DEFAULT true,
    "maxInstallments" INTEGER NOT NULL DEFAULT 12,
    "showPixDiscount" BOOLEAN NOT NULL DEFAULT false,
    "pixDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultPaymentMethod" TEXT NOT NULL DEFAULT 'credit_card',
    "enableOrderBumps" BOOLEAN NOT NULL DEFAULT true,
    "headerBackgroundImage" TEXT,
    "footerText" TEXT,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "_CouponToProduct_AB_unique" ON "_CouponToProduct"("A", "B");
