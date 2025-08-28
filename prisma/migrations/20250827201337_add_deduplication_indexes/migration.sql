-- CreateIndex
CREATE INDEX "PixelEventLog_pixelConfigId_eventType_createdAt_idx" ON "PixelEventLog"("pixelConfigId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "PixelEventLog_orderId_eventType_idx" ON "PixelEventLog"("orderId", "eventType");

-- CreateIndex
CREATE INDEX "PixelEventLog_sessionId_eventType_idx" ON "PixelEventLog"("sessionId", "eventType");

-- CreateIndex
CREATE INDEX "PixelEventLog_sessionId_pixelConfigId_eventType_idx" ON "PixelEventLog"("sessionId", "pixelConfigId", "eventType");
