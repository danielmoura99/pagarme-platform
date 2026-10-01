import { prisma } from "../db";

export type NeonDay = { day: string; bytes: number; cuHours: number };
export type NeonUsage = { days: NeonDay[]; fetchedAt: string; error?: string };
type Page = { projects?: { periods: { consumption: { timeframe_start: string; metrics: { metric_name: string; value: number }[] }[] }[] }[]; pagination?: { cursor?: string } };

export async function neonUsage(from: string, to: string): Promise<NeonUsage> {
  const key = process.env.NEON_API_KEY;
  const project = process.env.NEON_PROJECT_ID;
  const organization = process.env.NEON_ORG_ID;
  if (!key || !project || !organization) return { days: [], fetchedAt: "", error: "Configure NEON_API_KEY, NEON_PROJECT_ID e NEON_ORG_ID no servidor." };
  const cacheKey = `${project}:${from}:${to}`;
  const cached = await prisma.$queryRaw<{ payload: NeonUsage; fetched_at: Date }[]>`
    SELECT payload, fetched_at FROM db_monitor_neon_cache WHERE cache_key = ${cacheKey}
  `;
  if (cached[0] && Date.now() - cached[0].fetched_at.getTime() < 15 * 60_000) return cached[0].payload;
  try {
    const days = new Map<string, NeonDay>();
    let cursor: string | undefined;
    do {
      const params = new URLSearchParams({ project_ids: project, org_id: organization, from: `${from}T00:00:00Z`, to: `${to}T00:00:00Z`, granularity: "daily", metrics: "public_network_transfer_bytes,compute_unit_seconds" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`https://console.neon.tech/api/v2/consumption_history/v2/projects?${params}`, {
        headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Neon HTTP ${response.status}`);
      const data = await response.json() as Page;
      for (const project of data.projects ?? []) for (const period of project.periods) for (const row of period.consumption) {
        const day = row.timeframe_start.slice(0, 10);
        const item = days.get(day) ?? { day, bytes: 0, cuHours: 0 };
        for (const metric of row.metrics) {
          if (metric.metric_name === "public_network_transfer_bytes") item.bytes += metric.value;
          if (metric.metric_name === "compute_unit_seconds") item.cuHours += metric.value / 3600;
        }
        days.set(day, item);
      }
      const next = data.pagination?.cursor;
      if (next && next === cursor) throw new Error("Repeated cursor");
      cursor = next;
    } while (cursor);
    const payload: NeonUsage = { days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)), fetchedAt: new Date().toISOString() };
    await prisma.$executeRaw`
      INSERT INTO db_monitor_neon_cache (cache_key, payload) VALUES (${cacheKey}, ${JSON.stringify(payload)}::jsonb)
      ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now()
    `;
    return payload;
  } catch {
    return { days: cached[0]?.payload.days ?? [], fetchedAt: cached[0]?.payload.fetchedAt ?? "", error: "Não foi possível atualizar o consumo do Neon. Verifique a chave, os IDs e a disponibilidade da API. Dados anteriores, quando disponíveis, foram preservados." };
  }
}
