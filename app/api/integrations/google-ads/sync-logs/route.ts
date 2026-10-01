import { withDbMonitoring } from "@/lib/monitoring/route";
// app/api/integrations/google-ads/sync-logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

async function monitoredGET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const logs = await prisma.googleAdsSyncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[GOOGLE_ADS_SYNC_LOGS_ERROR]", error);
    return NextResponse.json({ logs: [] }, { status: 500 });
  }
}

export const GET = withDbMonitoring("GET /api/integrations/google-ads/sync-logs", monitoredGET);
