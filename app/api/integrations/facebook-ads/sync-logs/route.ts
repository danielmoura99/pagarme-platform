// app/api/integrations/facebook-ads/sync-logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
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
