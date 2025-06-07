-- AlterTable
ALTER TABLE "checkout_settings" ADD COLUMN     "headerMobileImage" TEXT,
ADD COLUMN     "sidebarBannerEnabled" BOOLEAN DEFAULT false,
ADD COLUMN     "sidebarBannerImage" TEXT,
ALTER COLUMN "headerMaxHeight" SET DEFAULT 350,
ALTER COLUMN "headerVerticalAlign" SET DEFAULT 'center';
