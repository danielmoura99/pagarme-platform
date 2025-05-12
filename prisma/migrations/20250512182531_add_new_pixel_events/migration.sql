-- AlterTable
ALTER TABLE "PixelEventLog" ADD COLUMN     "campaign" TEXT,
ADD COLUMN     "content" TEXT,
ADD COLUMN     "landingPage" TEXT,
ADD COLUMN     "medium" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "term" TEXT;

-- CreateIndex
CREATE INDEX "PixelEventLog_source_idx" ON "PixelEventLog"("source");

-- CreateIndex
CREATE INDEX "PixelEventLog_campaign_idx" ON "PixelEventLog"("campaign");
