-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "splitConfigurationId" TEXT;

-- CreateTable
CREATE TABLE "SplitConfiguration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitRecipient" (
    "id" TEXT NOT NULL,
    "splitConfigurationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientName" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "isLiable" BOOLEAN NOT NULL DEFAULT false,
    "chargeProcessingFee" BOOLEAN NOT NULL DEFAULT false,
    "chargeRemainderFee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitRecipient_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_splitConfigurationId_fkey" FOREIGN KEY ("splitConfigurationId") REFERENCES "SplitConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitRecipient" ADD CONSTRAINT "SplitRecipient_splitConfigurationId_fkey" FOREIGN KEY ("splitConfigurationId") REFERENCES "SplitConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
