// Authorization regression tests. No database, network or environment secrets.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const ts = require("typescript");

function loadEndpoint(file, state, exportName = "GET") {
  const filename = path.resolve(file);
  const unit = new Module(filename, module);
  unit.filename = filename;
  unit.paths = module.paths;
  const model = {
    findMany: async () => { state.reads++; return []; },
    count: async () => { state.reads++; return 0; },
  };
  unit.require = id => {
    if (id === "@/lib/mesma-origem") return { bloquearSeExterno: loadEndpoint("lib/mesma-origem.ts", state, "bloquearSeExterno") };
    if (id === "next-auth") return { getServerSession: async () => { state.authCalls++; return state.session; } };
    if (id === "@/app/api/auth/[...nextauth]/auth") return { authOptions: {} };
    if (id === "@/lib/db") return { prisma: { order: model, customer: model } };
    if (id === "@/lib/monitoring/route") return { withDbMonitoring: (_route, handler) => (...args) => { state.monitorCalls++; return handler(...args); } };
    if (id === "@/lib/mask") return { maskDocument: x => x, maskPhone: x => x };
    return require(id);
  };
  unit._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return unit.exports[exportName];
}

async function main() {
  // Do not inherit a developer's escape hatch while testing the default policy.
  delete process.env.ALLOW_EXTERNAL_API;
  const messages = [];
  const warn = console.warn;
  console.warn = (...args) => messages.push(args.join(" "));
  try {
    for (const endpoint of ["sales", "analytics/pixels"]) {
      const state = { session: null, reads: 0, authCalls: 0, monitorCalls: 0 };
      const get = loadEndpoint(`app/api/${endpoint}/route.ts`, state);
      for (const site of [null, "cross-site", "same-site", "none", "invalid"]) {
        const headers = { referer: "https://example.com/private?secret=fixture", "user-agent": "fixture" };
        if (site !== null) headers["sec-fetch-site"] = site;
        const response = await get(new Request(`http://localhost/api/${endpoint}`, { headers }));
        assert.equal(response.status, 403);
        assert.equal(response.headers.get("cache-control"), "no-store");
      }
      assert.equal(state.authCalls, 0, "Rejected metadata must not query sessions");
      assert.equal(state.monitorCalls, 0, "Rejected metadata must not persist telemetry");
      assert.equal(state.reads, 0);
      const response = await get(new Request(`http://localhost/api/${endpoint}`, { headers: { "sec-fetch-site": "same-origin" } }));
      assert.equal(response.status, 401, "Passing metadata must still require authentication");
      assert.equal(state.authCalls, 1);
      assert.equal(state.monitorCalls, 1);
      console.log(`PASS ${endpoint}: metadata rejected before auth/telemetry; same-origin still requires login.`);
    }
    assert.equal(messages.length, 10);
    assert.ok(messages.every(message => !message.includes("secret=fixture") && !message.includes("/private")));
    process.env.ALLOW_EXTERNAL_API = "true";
    const bypass = loadEndpoint("lib/mesma-origem.ts", {}, "bloquearSeExterno");
    assert.equal(bypass(new Request("http://localhost/api/sales"), "/api/sales"), null);
  } finally {
    console.warn = warn;
    delete process.env.ALLOW_EXTERNAL_API;
  }
  for (const endpoint of ["sales", "clients"]) {
    const state = { session: null, reads: 0, authCalls: 0, monitorCalls: 0 };
    const get = loadEndpoint(`app/api/${endpoint}/route.ts`, state);
    if (endpoint === "sales") {
      for (const session of [null, { user: { id: "fixture", role: "admin" } }]) {
        state.session = session;
        for (const query of ["days=2&page=1&limit=100", "days=", "days=2&from=2026-10-01&to=2026-10-24"]) {
          const response = await get(new Request(`http://localhost/api/sales?${query}`));
          assert.equal(response.status, 400);
        }
      }
      assert.equal(state.authCalls, 0, "Invalid polling must not validate sessions in the database");
      assert.equal(state.monitorCalls, 0, "Invalid polling must not persist monitoring samples");
      assert.equal(state.reads, 0);
      console.log("PASS sales: unsupported days rejected before auth, business queries and telemetry.");
    }
    for (const query of ["", "?export=true&limit=999999&unmask=true"]) {
      for (const role of [null, "affiliate", "customer", "unexpected", undefined]) {
        state.session = role === null ? null : { user: { id: "fixture", role } };
        const response = await get(new Request(`http://localhost/api/${endpoint}${query}`, { headers: { "sec-fetch-site": "same-origin" } }));
        assert.equal(response.status, role === null ? 401 : 403);
        assert.equal(state.reads, 0, "Unauthorized request must not read business data");
      }
    }
    state.session = { user: { id: "fixture", role: "admin" } };
    for (const query of ["", "?export=true&limit=999999&unmask=true"]) {
      const response = await get(new Request(`http://localhost/api/${endpoint}${query}`, { headers: { "sec-fetch-site": "same-origin" } }));
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data[endpoint], []);
      assert.equal(data.pagination.totalCount, 0);
    }
    assert.equal(state.reads, 4);
    console.log(`PASS ${endpoint}: anonymous denied, non-admin roles denied before data access, admin list/export preserved.`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
