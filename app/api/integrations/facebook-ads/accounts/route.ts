// app/api/integrations/facebook-ads/accounts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchAdAccounts } from "@/lib/facebook-ads";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.facebookAdsConfig.findFirst();

    if (!config?.accessToken) {
      return NextResponse.json({ error: "Não conectado ao Facebook Ads" }, { status: 401 });
    }

    const accounts = await fetchAdAccounts(config.accessToken);
    const active = accounts.filter((a) => a.account_status === 1);

    return NextResponse.json({ accounts: active });
  } catch (error) {
    console.error("[FB_ADS_ACCOUNTS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar contas de anúncio" }, { status: 500 });
  }
}
