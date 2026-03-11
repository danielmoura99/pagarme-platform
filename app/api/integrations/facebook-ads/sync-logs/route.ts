// app/api/integrations/facebook-ads/sync-logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.facebookAdsConfig.findFirst();
    if (!config) {
      return NextResponse.json({ logs: [] });
    }

    const logs = await prisma.facebookAdsSyncLog.findMany({
      where: { configId: config.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[FB_ADS_SYNC_LOGS_ERROR]", error);
    return NextResponse.json({ logs: [] });
  }
}
