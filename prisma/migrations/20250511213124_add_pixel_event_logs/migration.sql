-- CreateTable
CREATE TABLE "PixelEventLog" (
    "id" TEXT NOT NULL,
    "pixelConfigId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "orderId" TEXT,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixelEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PixelEventLog_pixelConfigId_idx" ON "PixelEventLog"("pixelConfigId");

-- CreateIndex
CREATE INDEX "PixelEventLog_eventType_idx" ON "PixelEventLog"("eventType");

-- CreateIndex
CREATE INDEX "PixelEventLog_createdAt_idx" ON "PixelEventLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PixelEventLog" ADD CONSTRAINT "PixelEventLog_pixelConfigId_fkey" FOREIGN KEY ("pixelConfigId") REFERENCES "PixelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
