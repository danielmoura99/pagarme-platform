import { prisma } from "../db";
import { collectRequest, sampleRate, type Sample } from "./context";

let retryAfter = 0;

async function saveSample(sample: Sample, failed: boolean) {
  if (Date.now() < retryAfter) return;
  const environment = process.env.VERCEL_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
  const operations = JSON.stringify(Object.fromEntries(sample.operations));
  try {
    // One bounded write per sampled request; no RETURNING of stored data.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '1000ms'");
      await tx.$executeRaw`
        INSERT INTO db_monitor_samples (recorded_at, environment, route, sample_rate, failed, operations)
        VALUES (${sample.startedAt}, ${environment}, ${sample.route}, ${sample.rate}, ${failed}, ${operations}::jsonb)
      `;
      // Opportunistic, bounded retention; does not wake the database on a schedule.
      if (Math.random() < 0.01) {
        await tx.$executeRaw`
          DELETE FROM db_monitor_samples WHERE id IN (
            SELECT id FROM db_monitor_samples WHERE recorded_at < now() - interval '30 days'
            ORDER BY recorded_at LIMIT 1000
          )
        `;
        await tx.$executeRaw`DELETE FROM db_monitor_neon_cache WHERE fetched_at < now() - interval '30 days'`;
      }
    }, { maxWait: 1000, timeout: 2000 });
  } catch {
    retryAfter = Date.now() + 60_000;
    console.warn("[DB_MONITOR] Persistence unavailable; samples may be missing. Retry in 60 seconds.");
  }
}

export function withDbMonitoring<A extends unknown[], R>(route: string, handler: (...args: A) => Promise<R>) {
  return (...args: A): Promise<R> => {
    if (process.env.DB_MONITOR_ENABLED !== "true") return handler(...args);
    return collectRequest(route, sampleRate(), () => handler(...args), saveSample);
  };
}
