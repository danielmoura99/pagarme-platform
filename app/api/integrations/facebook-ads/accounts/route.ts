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

    console.log("[FB_ADS_ACCOUNTS] Total retornado pela API:", accounts.length);
    console.log("[FB_ADS_ACCOUNTS] Statuses:", accounts.map((a) => ({ id: a.id, name: a.name, status: a.account_status })));

    // Aceitar contas ativas (1) e ativas via Business Manager (101)
    const active = accounts.filter((a) => [1, 101].includes(a.account_status));

    // Se filtro não retornar nada, retornar todas (para não bloquear em casos edge)
    const result = active.length > 0 ? active : accounts;

    return NextResponse.json({ accounts: result });
  } catch (error) {
    console.error("[FB_ADS_ACCOUNTS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar contas de anúncio" }, { status: 500 });
  }
}
