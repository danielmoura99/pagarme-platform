-- CreateTable
CREATE TABLE "rd_station_config" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "syncEvents" JSONB NOT NULL DEFAULT '[]',
    "leadMapping" JSONB NOT NULL DEFAULT '{}',
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" INTEGER NOT NULL DEFAULT 300,
    "batchSize" INTEGER NOT NULL DEFAULT 50,
    "lastSyncAt" TIMESTAMP(3),
    "totalSynced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rd_station_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rd_station_sync_log" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "pixelEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "rdEventType" TEXT NOT NULL,
    "leadEmail" TEXT,
    "leadData" JSONB,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "rdStationId" TEXT,
    "response" JSONB,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rd_station_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rd_station_product_config" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "customTags" JSONB DEFAULT '[]',
    "customFields" JSONB DEFAULT '{}',
    "eventMapping" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rd_station_product_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rd_station_sync_log_configId_idx" ON "rd_station_sync_log"("configId");

-- CreateIndex
CREATE INDEX "rd_station_sync_log_status_idx" ON "rd_station_sync_log"("status");

-- CreateIndex
CREATE INDEX "rd_station_sync_log_pixelEventId_idx" ON "rd_station_sync_log"("pixelEventId");

-- CreateIndex
CREATE INDEX "rd_station_sync_log_leadEmail_idx" ON "rd_station_sync_log"("leadEmail");

-- CreateIndex
CREATE INDEX "rd_station_sync_log_scheduledAt_idx" ON "rd_station_sync_log"("scheduledAt");

-- CreateIndex
CREATE INDEX "rd_station_sync_log_rdEventType_idx" ON "rd_station_sync_log"("rdEventType");

-- CreateIndex
CREATE UNIQUE INDEX "rd_station_product_config_productId_key" ON "rd_station_product_config"("productId");

-- AddForeignKey
ALTER TABLE "rd_station_sync_log" ADD CONSTRAINT "rd_station_sync_log_configId_fkey" FOREIGN KEY ("configId") REFERENCES "rd_station_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rd_station_product_config" ADD CONSTRAINT "rd_station_product_config_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
