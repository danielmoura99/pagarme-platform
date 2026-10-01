"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Operation = { route: string; operation: string; samples: number; calls: number; sampled_bytes: number; estimated_bytes: number; total_ms: number; errors: number; size_errors: number };
type Route = { route: string; samples: number; estimated_requests: number; estimated_bytes: number; failures: number; first_seen: string; last_seen: string };
type Data = {
  enabled: boolean; sampleRate: number; environment: string; from: string; to: string;
  operations: Operation[]; routes: Route[];
  coverage: { first_seen: string | null; last_seen: string | null; samples: number; min_rate: number; max_rate: number }[];
  neon: { days: { day: string; bytes: number; cuHours: number }[]; fetchedAt: string; error?: string };
};
const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const bytes = (value: number) => value >= 1e9 ? `${number(value / 1e9)} GB` : value >= 1e6 ? `${number(value / 1e6)} MB` : `${number(value / 1e3)} kB`;
const date = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR") : "Sem amostras";

export default function MonitorDashboard() {
  const [days, setDays] = useState(7);
  const [environment, setEnvironment] = useState("production");
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    fetch(`/api/admin/db-monitoring?days=${days}&environment=${environment}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Falha ao carregar."); return body as Data; })
      .then(setData)
      .catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, environment, refresh]);
  const totalBytes = data?.neon.days.reduce((sum, day) => sum + day.bytes, 0) ?? 0;
  const totalCU = data?.neon.days.reduce((sum, day) => sum + day.cuHours, 0) ?? 0;
  const coverage = data?.coverage[0];
  const ranking = data?.routes.map((route) => ({ ...route, estimatedBytes: route.estimated_bytes })).sort((a, b) => b.estimatedBytes - a.estimatedBytes) ?? [];

  return <div className="mx-auto max-w-7xl space-y-6 p-6 text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Monitoramento do banco</h1><p className="text-sm text-slate-600">Consumo do Neon e origem estimada das leituras da aplicação.</p></div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Período" className="rounded border bg-white p-2" value={days} onChange={e => setDays(Number(e.target.value))}>
          {[1, 7, 14, 30].map(d => <option key={d} value={d}>{d === 1 ? "Hoje (UTC)" : `Últimos ${d} dias`}</option>)}
        </select>
        <select aria-label="Ambiente da coleta" className="rounded border bg-white p-2" value={environment} onChange={e => setEnvironment(e.target.value)}>
          <option value="production">Produção</option><option value="preview">Preview</option><option value="development">Desenvolvimento</option>
        </select>
        <button disabled={loading} onClick={() => setRefresh(v => v + 1)} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Atualizar</button>
      </div>
    </div>
    {loading && <p role="status">Carregando métricas…</p>}
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-4">{error}</p>}
    {data && <>
      {!data.enabled && <p className="rounded bg-amber-50 p-4">Coleta desativada neste servidor. Configure DB_MONITOR_ENABLED=true para registrar novas amostras.</p>}
      {data.neon.error && <p role="alert" className="rounded bg-amber-50 p-4">{data.neon.error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {[['Transferência real • projeto Neon', data.neon.days.length ? bytes(totalBytes) : 'Indisponível'], ['Compute • projeto Neon', data.neon.days.length ? `${number(totalCU)} CU-h` : 'Indisponível'], ['Requisições amostradas • ambiente', number(coverage?.samples ?? 0)]].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
      </div>
      <div className="rounded-xl border bg-white p-5 text-sm leading-6 text-slate-600">
        <p>Coleta configurada: {number(data.sampleRate * 100)}% das requisições. Primeira amostra neste período: {date(coverage?.first_seen ?? null)}. Última: {date(coverage?.last_seen ?? null)}.</p>
        <p>O ranking extrapola a amostra usando a taxa registrada em cada requisição. Poucas amostras geram estimativas instáveis. Resultados incluem relacionamentos retornados pelo Prisma; não representam bytes exatos do protocolo PostgreSQL.</p>
        <p>A cobertura inclui as rotas de API instrumentadas. Páginas renderizadas no servidor, Server Actions, scripts e operações executadas depois da resposta não entram no ranking. O painel e suas gravações também ficam fora dele.</p>
        <p>O Neon mostra o projeto inteiro, independentemente do ambiente selecionado. Dias em UTC; o dia atual pode estar incompleto. Última consulta ao Neon: {date(data.neon.fetchedAt || null)}. Cache de 15 minutos.</p>
      </div>
      <section className="rounded-xl border bg-white p-5"><h2 className="mb-4 text-lg font-semibold">Transferência diária real</h2>
        {data.neon.days.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.neon.days.map(d => ({ ...d, MB: d.bytes / 1e6 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tickFormatter={d => d.slice(5)} /><YAxis unit=" MB" /><Tooltip formatter={(v: number) => `${number(v)} MB`} /><Bar dataKey="MB" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p>Consumo do Neon indisponível para este período.</p>}
      </section>
      <section className="rounded-xl border bg-white p-5"><h2 className="mb-2 text-lg font-semibold">Rotas com maior volume estimado</h2>
        {!ranking.length ? <p>Ainda não há amostras neste ambiente e período. A coleta ocorre durante o uso da aplicação, mesmo com esta página fechada.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Rota</th><th>Amostras</th><th>Requisições estimadas</th><th>Resultado estimado</th><th>Falhas 5xx / exceções na amostra</th></tr></thead><tbody>{ranking.map(r => <tr key={r.route} className="border-b"><td className="p-2 font-mono text-xs">{r.route}</td><td>{r.samples}{r.samples < 30 ? ' • baixa amostra' : ''}</td><td>{number(r.estimated_requests)}</td><td>{bytes(r.estimatedBytes)}</td><td>{r.failures}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="rounded-xl border bg-white p-5"><h2 className="mb-2 text-lg font-semibold">Operações que mais retornam dados</h2><p className="mb-4 text-sm text-slate-600">Até 200 grupos. Uma operação Prisma pode executar várias consultas SQL. Tempos incluem a espera do cliente e não equivalem a CPU faturada.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Rota / operação</th><th>Operações amostradas</th><th>Bytes amostrados</th><th>Bytes estimados</th><th>Tempo médio</th><th>Erros / medição</th></tr></thead><tbody>{data.operations.map(o => <tr key={`${o.route}:${o.operation}`} className="border-b"><td className="p-2"><p className="font-mono text-xs">{o.route}</p><p>{o.operation}</p></td><td>{o.calls}</td><td>{bytes(o.sampled_bytes)}</td><td>{bytes(o.estimated_bytes)}</td><td>{number(o.total_ms / Math.max(1, o.calls))} ms</td><td>{o.errors} / {o.size_errors}</td></tr>)}</tbody></table></div>
      </section>
    </>}
  </div>;
}
