import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { prisma } from "@/lib/db";
import { sampleRate } from "@/lib/monitoring/context";
import { neonUsage } from "@/lib/monitoring/neon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  const search = new URL(request.url).searchParams;
  const days = Number(search.get("days") ?? 7);
  const environment = search.get("environment") ?? "production";
  if (![1, 7, 14, 30].includes(days) || !["production", "preview", "development"].includes(environment)) {
    return NextResponse.json({ error: "Período ou ambiente inválido." }, { status: 400 });
  }
  const end = new Date(); end.setUTCHours(0, 0, 0, 0); end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days);
  try {
    // Aggregate in Postgres. The browser never receives individual samples or ORM results.
    const routes = await prisma.$queryRaw`
      SELECT route, COUNT(*)::int AS samples, SUM(1.0 / sample_rate)::float AS estimated_requests,
        SUM(COALESCE((SELECT SUM((value->>'bytes')::float) FROM jsonb_each(operations)), 0) / sample_rate)::float AS estimated_bytes,
        COUNT(*) FILTER (WHERE failed)::int AS failures, MIN(recorded_at) AS first_seen, MAX(recorded_at) AS last_seen
      FROM db_monitor_samples WHERE recorded_at >= ${start} AND recorded_at < ${end} AND environment = ${environment}
      GROUP BY route ORDER BY samples DESC LIMIT 150
    `;
    const operations = await prisma.$queryRaw`
      SELECT route, o.key AS operation, COUNT(*)::int AS samples,
        SUM((o.value->>'calls')::float)::float AS calls,
        SUM((o.value->>'bytes')::float)::float AS sampled_bytes,
        SUM((o.value->>'bytes')::float / sample_rate)::float AS estimated_bytes,
        SUM((o.value->>'ms')::float)::float AS total_ms,
        SUM((o.value->>'errors')::int)::int AS errors,
        SUM((o.value->>'sizeErrors')::int)::int AS size_errors
      FROM db_monitor_samples CROSS JOIN LATERAL jsonb_each(operations) o
      WHERE recorded_at >= ${start} AND recorded_at < ${end} AND environment = ${environment}
      GROUP BY route, o.key ORDER BY estimated_bytes DESC LIMIT 200
    `;
    const coverage = await prisma.$queryRaw`
      SELECT MIN(recorded_at) AS first_seen, MAX(recorded_at) AS last_seen, COUNT(*)::int AS samples,
        MIN(sample_rate) AS min_rate, MAX(sample_rate) AS max_rate
      FROM db_monitor_samples WHERE environment = ${environment} AND recorded_at >= ${start} AND recorded_at < ${end}
    `;
    const neon = await neonUsage(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
    return NextResponse.json({ routes, operations, coverage, neon, environment,
      enabled: process.env.DB_MONITOR_ENABLED === "true", sampleRate: sampleRate(),
      from: start.toISOString(), to: end.toISOString(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Monitoramento indisponível. Verifique se a migration de monitoramento foi aplicada e se o banco está acessível." }, { status: 503 });
  }
}
