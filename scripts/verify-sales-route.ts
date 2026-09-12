// Compara a rota NOVA (agregada em SQL) com o baseline capturado da versão antiga
import { prisma } from "../lib/db";
import * as fs from "fs";

(async () => {
  const baseline = JSON.parse(fs.readFileSync("scripts/.baseline.json", "utf8"));

  // Chama a lógica nova através da própria rota (import dinâmico do handler)
  const mod = await import("../app/api/analytics/sales/route");
  // getServerSession não roda fora do Next — replicamos as queries da rota:
  const { formatInTimeZone, fromZonedTime } = await import("date-fns-tz");
  const TZ = "America/Sao_Paulo";
  const monthKeyBR = (d: Date) => formatInTimeZone(d, TZ, "MMM/yy");
  function buildMonthsBR(months: number) {
    const [curY, curM] = formatInTimeZone(new Date(), TZ, "yyyy-MM").split("-").map(Number);
    const list: { key: string; start: Date; end: Date }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      let y = curY, m = curM - i;
      while (m <= 0) { m += 12; y -= 1; }
      const start = fromZonedTime(`${y}-${String(m).padStart(2,"0")}-01T00:00:00`, TZ);
      let ny = y, nm = m + 1; if (nm > 12) { nm = 1; ny += 1; }
      const end = new Date(fromZonedTime(`${ny}-${String(nm).padStart(2,"0")}-01T00:00:00`, TZ).getTime() - 1);
      list.push({ key: monthKeyBR(start), start, end });
    }
    return list;
  }

  const monthsBR = buildMonthsBR(12);
  const ini = monthsBR[0].start.toISOString();
  const fim = monthsBR[monthsBR.length-1].end.toISOString();

  const porMes = await prisma.$queryRaw<any[]>`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes,
           COUNT(*)::int AS vendas, COALESCE(SUM(amount),0)::bigint AS receita_cents
    FROM "Order" WHERE status='paid' AND "createdAt" >= ${ini}::timestamp AND "createdAt" <= ${fim}::timestamp
    GROUP BY 1`;
  const mapa = new Map(porMes.map(r => [r.mes, { v: Number(r.vendas), r: Number(r.receita_cents) }]));
  const salesByMonth = monthsBR.map(m => {
    const d = mapa.get(formatInTimeZone(m.start, TZ, "yyyy-MM")) ?? { v:0, r:0 };
    return { month: m.key, sales: d.v, revenue: d.r/100 };
  });

  const produtosRaw = await prisma.$queryRaw<any[]>`
    SELECT p.name AS nome, SUM(oi.quantity)::int AS quantidade, COALESCE(SUM(oi.price*oi.quantity),0)::bigint AS receita_cents
    FROM "Order" o JOIN "OrderItem" oi ON oi."orderId"=o.id JOIN "Product" p ON p.id=oi."productId"
    WHERE o.status='paid' AND o."createdAt" >= ${ini}::timestamp AND o."createdAt" <= ${fim}::timestamp
    GROUP BY p.name`;
  const grp = (n: string) => { const m = n.match(/^(Trader\s+(?:DIRETO\s+)?\d+K?)/i); return m ? m[1] : n; };
  const agr: Record<string, {name:string;quantity:number;revenue:number}> = {};
  for (const p of produtosRaw) {
    const k = grp(p.nome);
    agr[k] ??= { name: k, quantity: 0, revenue: 0 };
    agr[k].quantity += Number(p.quantidade);
    agr[k].revenue += Number(p.receita_cents);
  }
  const produtos = Object.values(agr).map(d => ({ nome: d.name, quantidade: d.quantity, receita_cents: d.revenue })).sort((a,b)=>b.quantidade-a.quantidade);

  const topAf = await prisma.$queryRaw<any[]>`
    SELECT a.id, u.name AS nome, u.email, COALESCE(SUM(o.amount),0)::bigint AS receita_cents, COUNT(*)::int AS vendas
    FROM "Order" o JOIN "Affiliate" a ON a.id=o."affiliateId" JOIN "User" u ON u.id=a."userId"
    WHERE o.status='paid' AND o."createdAt" >= ${ini}::timestamp AND o."createdAt" <= ${fim}::timestamp
    GROUP BY a.id, u.name, u.email ORDER BY receita_cents DESC LIMIT 10`;

  const novo = {
    metrics: {
      totalSales: salesByMonth.reduce((s,m)=>s+m.sales,0),
      totalRevenue: salesByMonth.reduce((s,m)=>s+m.revenue,0),
    },
    salesByMonth,
    productsSold: produtos.map(p=>({name:p.nome,quantity:Number(p.quantidade),revenue:Number(p.receita_cents)/100})),
    topAffiliates: topAf.map(a=>({id:a.id,revenue:Number(a.receita_cents)/100,salesCount:Number(a.vendas)})),
  };

  let erros = 0;
  const chk = (nome: string, a: any, b: any, tol = 0.011) => {
    const ok = typeof a === "number" ? Math.abs(a-b) <= tol : JSON.stringify(a) === JSON.stringify(b);
    if (!ok) { erros++; console.log(`  DIVERGE ${nome}: antigo=${JSON.stringify(a)} novo=${JSON.stringify(b)}`); }
    else console.log(`  OK  ${nome}`);
  };

  console.log("\n=== COMPARACAO ===");
  chk("metrics.totalSales", baseline.metrics.totalSales, novo.metrics.totalSales);
  chk("metrics.totalRevenue", baseline.metrics.totalRevenue, novo.metrics.totalRevenue);
  console.log("\n-- salesByMonth (12 meses) --");
  baseline.salesByMonth.forEach((b: any, i: number) => {
    chk(`${b.month} vendas`, b.sales, novo.salesByMonth[i].sales);
    chk(`${b.month} receita`, b.revenue, novo.salesByMonth[i].revenue);
  });
  console.log("\n-- produtos --");
  chk("qtd de produtos", baseline.productsSold.length, novo.productsSold.length);
  baseline.productsSold.forEach((b: any) => {
    const n = novo.productsSold.find(x => x.name === b.name);
    if (!n) { erros++; console.log(`  DIVERGE produto ausente: ${b.name}`); return; }
    chk(`${b.name} qtd`, b.quantity, n.quantity);
    chk(`${b.name} receita`, b.revenue, n.revenue);
  });
  console.log("\n-- top afiliados --");
  chk("qtd afiliados", baseline.topAffiliates.length, novo.topAffiliates.length);
  baseline.topAffiliates.forEach((b: any, i: number) => {
    chk(`#${i+1} receita`, b.revenue, novo.topAffiliates[i]?.revenue);
    chk(`#${i+1} vendas`, b.salesCount, novo.topAffiliates[i]?.salesCount);
  });

  console.log(erros === 0 ? "\nRESULTADO: nenhuma divergencia" : `\nRESULTADO: ${erros} divergencia(s)`);
  await prisma.$disconnect();
})();
