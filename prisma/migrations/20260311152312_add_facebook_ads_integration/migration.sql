-- CreateTable
CREATE TABLE "facebook_ads_config" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "adAccountId" TEXT,
    "adAccountName" TEXT,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" INTEGER NOT NULL DEFAULT 360,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_ads_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_ads_campaign_data" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "adSetId" TEXT,
    "adSetName" TEXT,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_ads_campaign_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_ads_sync_log" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "campaigns" INTEGER NOT NULL DEFAULT 0,
    "dateRange" TEXT,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facebook_ads_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facebook_ads_campaign_data_dateStart_dateEnd_idx" ON "facebook_ads_campaign_data"("dateStart", "dateEnd");

-- CreateIndex
CREATE INDEX "facebook_ads_campaign_data_campaignName_idx" ON "facebook_ads_campaign_data"("campaignName");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_ads_campaign_data_campaignId_dateStart_dateEnd_key" ON "facebook_ads_campaign_data"("campaignId", "dateStart", "dateEnd");

-- CreateIndex
CREATE INDEX "facebook_ads_sync_log_configId_idx" ON "facebook_ads_sync_log"("configId");

-- CreateIndex
CREATE INDEX "facebook_ads_sync_log_status_idx" ON "facebook_ads_sync_log"("status");

-- AddForeignKey
ALTER TABLE "facebook_ads_sync_log" ADD CONSTRAINT "facebook_ads_sync_log_configId_fkey" FOREIGN KEY ("configId") REFERENCES "facebook_ads_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
