/*
  Warnings:

  - A unique constraint covering the columns `[pagarmeTransactionId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Order_pagarmeTransactionId_key" ON "Order"("pagarmeTransactionId");
