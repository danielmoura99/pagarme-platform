-- CreateTable
CREATE TABLE "OrderBump" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bumpProductId" TEXT NOT NULL,
    "discount" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderBump_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderBump" ADD CONSTRAINT "OrderBump_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBump" ADD CONSTRAINT "OrderBump_bumpProductId_fkey" FOREIGN KEY ("bumpProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
