const fs = require("node:fs");
const ts = require("typescript");
const assert = require("node:assert/strict");
// Compile the isolated collector in memory; no live database or credentials needed.
const Module = require("node:module");
const compiled = ts.transpileModule(fs.readFileSync("lib/monitoring/context.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const unit = new Module(require("node:path").resolve("lib/monitoring/context.ts"), module);
unit.filename = unit.id; unit.paths = module.paths; unit._compile(compiled, unit.filename);
const { collectRequest, observeOperation, resultBytes, sampleRate } = unit.exports;

async function main() {
  assert.equal(resultBytes({ value: 42n, label: "ação" }), Buffer.byteLength(JSON.stringify({ value: "42", label: "ação" })));
  const saved = [];
  const save = async (sample, failed) => saved.push({ route: sample.route, operations: Object.fromEntries(sample.operations), failed });
  await Promise.all(["A", "B"].map((route, index) => collectRequest(route, 1, async () => {
    await new Promise(resolve => setTimeout(resolve, index ? 1 : 10));
    return observeOperation("Order", "findMany", async () => [{ route }]);
  }, save)));
  assert.equal(saved.length, 2);
  for (const row of saved) {
    assert.equal(row.operations["Order.findMany"].calls, 1);
    assert.equal(row.operations["Order.findMany"].bytes, resultBytes([{ route: row.route }]));
    assert.equal(JSON.stringify(row).includes('"Order"'), false);
  }
  let called = false;
  await collectRequest("off", 0, () => observeOperation("User", "findMany", async () => []), async () => { called = true; });
  assert.equal(called, false);
  await collectRequest("skip", 0.1, async () => 3, async () => { called = true; }, () => 0.9);
  assert.equal(called, false);
  const original = new Error("payment failed");
  await assert.rejects(collectRequest("error", 1, () => observeOperation("Order", "create", async () => { throw original; }), save), e => e === original);
  assert.equal(saved.at(-1).operations["Order.create"].errors, 1);
  assert.equal(saved.at(-1).failed, true);
  assert.equal(await collectRequest("save-fails", 1, async () => 42, async () => { throw new Error("storage"); }), 42);
  const circular = {}; circular.self = circular;
  assert.equal(await collectRequest("size-fails", 1, () => observeOperation("Order", "findMany", async () => circular), save), circular);
  assert.equal(saved.at(-1).operations["Order.findMany"].sizeErrors, 1);
  await collectRequest("http-error", 1, async () => new Response(null, { status: 503 }), save);
  assert.equal(saved.at(-1).failed, true);
  process.env.DB_MONITOR_SAMPLE_RATE = "NaN"; assert.equal(sampleRate(), 0.1);
  process.env.DB_MONITOR_SAMPLE_RATE = "0"; assert.equal(sampleRate(), 0);
  // Test the HTTP boundary with mocked dependencies: unauthorized requests must
  // never query telemetry or call the Neon API.
  let role;
  let reads = 0;
  let neonCalls = 0;
  const endpointFile = require("node:path").resolve("app/api/admin/db-monitoring/route.ts");
  const endpoint = new Module(endpointFile, module);
  endpoint.filename = endpointFile; endpoint.paths = module.paths;
  endpoint.require = id => {
    if (id === "next-auth") return { getServerSession: async () => role ? { user: { role } } : null };
    if (id.includes("/auth/[...nextauth]/auth")) return { authOptions: {} };
    if (id === "@/lib/db") return { prisma: { $queryRaw: async () => { reads++; return []; } } };
    if (id === "@/lib/monitoring/context") return { sampleRate: () => 0.1 };
    if (id === "@/lib/monitoring/neon") return { neonUsage: async () => { neonCalls++; return { days: [], fetchedAt: "" }; } };
    return require(id);
  };
  endpoint._compile(ts.transpileModule(fs.readFileSync(endpointFile, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, endpointFile);
  for (role of [undefined, "affiliate"]) {
    assert.equal((await endpoint.exports.GET(new Request("http://localhost/api/admin/db-monitoring"))).status, 403);
  }
  assert.equal(reads, 0); assert.equal(neonCalls, 0);
  role = "admin";
  for (const query of ["days=999", "days=NaN", "environment=invalid"]) {
    assert.equal((await endpoint.exports.GET(new Request(`http://localhost/api/admin/db-monitoring?${query}`))).status, 400);
  }
  assert.equal(reads, 0);
  assert.equal((await endpoint.exports.GET(new Request("http://localhost/api/admin/db-monitoring?days=7"))).status, 200);
  assert.equal(reads, 3); assert.equal(neonCalls, 1);
  console.log("PASS: isolation, sampling, bytes, bigint, HTTP/DB errors, persistence failure, serialization failure.");
  console.log("PASS: anonymous/affiliate authorization, bounded input, admin API access.");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
