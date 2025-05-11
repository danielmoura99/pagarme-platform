-- CreateTable
CREATE TABLE "PixelConfig" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pixelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "events" JSONB NOT NULL,
    "customCode" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PixelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PixelConfig_productId_idx" ON "PixelConfig"("productId");

-- CreateIndex
CREATE INDEX "PixelConfig_platform_idx" ON "PixelConfig"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "PixelConfig_productId_platform_pixelId_key" ON "PixelConfig"("productId", "platform", "pixelId");

-- AddForeignKey
ALTER TABLE "PixelConfig" ADD CONSTRAINT "PixelConfig_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
