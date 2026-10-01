import { AsyncLocalStorage } from "node:async_hooks";

export type Operation = { calls: number; bytes: number; ms: number; errors: number; sizeErrors: number };
export type Sample = {
  route: string;
  rate: number;
  startedAt: Date;
  operations: Map<string, Operation>;
  closed: boolean;
};
const shared = globalThis as unknown as { dbMonitoringContext?: AsyncLocalStorage<Sample | null> };
export const monitoringContext = shared.dbMonitoringContext ??= new AsyncLocalStorage<Sample | null>();

export function sampleRate() {
  const value = Number(process.env.DB_MONITOR_SAMPLE_RATE ?? "0.1");
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.1;
}

// JSON is an estimate of the ORM result, NOT PostgreSQL protocol bytes.
// Never retain or log serialized results, query arguments, SQL or identifiers.
export function resultBytes(value: unknown): number {
  const json = JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
  return json === undefined ? 0 : Buffer.byteLength(json, "utf8");
}

export async function observeOperation<T>(model: string | undefined, action: string, next: () => Promise<T>): Promise<T> {
  const sample = monitoringContext.getStore();
  if (!sample || sample.closed) return next();
  const key = `${model ?? "raw"}.${action}`;
  const operation = sample.operations.get(key) ?? { calls: 0, bytes: 0, ms: 0, errors: 0, sizeErrors: 0 };
  sample.operations.set(key, operation);
  operation.calls++;
  const started = performance.now();
  try {
    const result = await next();
    operation.ms += performance.now() - started;
    try { operation.bytes += resultBytes(result); } catch { operation.sizeErrors++; }
    return result;
  } catch (error) {
    operation.ms += performance.now() - started;
    operation.errors++;
    throw error;
  }
}

export async function collectRequest<T>(
  route: string, rate: number, handler: () => Promise<T>,
  save: (sample: Sample, failed: boolean) => Promise<void>, random = Math.random,
): Promise<T> {
  if (rate <= 0 || random() >= rate) return monitoringContext.run(null, handler);
  const sample: Sample = { route, rate, startedAt: new Date(), operations: new Map(), closed: false };
  return monitoringContext.run(sample, async () => {
    let failed = false;
    try {
      const result = await handler();
      failed = result instanceof Response && result.status >= 500;
      return result;
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      sample.closed = true;
      // Await persistence before the serverless invocation finishes. No background timers.
      try { await monitoringContext.run(null, () => save(sample, failed)); }
      catch { console.warn("[DB_MONITOR] Sample could not be persisted"); }
    }
  });
}
