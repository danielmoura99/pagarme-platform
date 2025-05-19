-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutId" TEXT;

-- CreateIndex
CREATE INDEX "Order_checkoutId_idx" ON "Order"("checkoutId");
