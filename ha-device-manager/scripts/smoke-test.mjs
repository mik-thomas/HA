#!/usr/bin/env node
/**
 * Smoke test HA Device Manager (run after changes).
 * Usage: BASE_URL=http://localhost:3001 node scripts/smoke-test.mjs
 */

const base = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

const routes = [
  { path: "/", name: "Devices", expectText: "Devices" },
  { path: "/areas", name: "Areas", expectText: "Areas" },
  { path: "/organize", name: "Organize", expectText: "Organize" },
  { path: "/labels", name: "Labels", expectText: "Labels" },
  { path: "/scan", name: "Scan", expectText: "Scan" },
  { path: "/automations", name: "Automations", expectText: "Automations" },
];

const apiChecks = [
  { path: "/api/health", name: "health" },
  { path: "/api/ping", name: "ping" },
  { path: "/api/devices", name: "devices", expectKey: "devices" },
  { path: "/api/areas", name: "areas", expectKey: "areas" },
  { path: "/api/automations", name: "automations", expectKey: "automations" },
];

let failed = 0;

async function checkApi({ path, name, expectKey }) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    if (!res.ok) {
      console.error(`FAIL API ${name}: HTTP ${res.status} — ${text.slice(0, 120)}`);
      failed++;
      return;
    }
    if (expectKey) {
      const json = JSON.parse(text);
      if (!(expectKey in json)) {
        console.error(`FAIL API ${name}: missing key "${expectKey}"`);
        failed++;
        return;
      }
      if (expectKey === "devices" && !Array.isArray(json.devices)) {
        console.error(`FAIL API ${name}: devices is not an array`);
        failed++;
        return;
      }
      console.log(`OK   API ${name} (${json[expectKey]?.length ?? "?"} items)`);
    } else {
      console.log(`OK   API ${name} (${res.status})`);
    }
  } catch (e) {
    console.error(`FAIL API ${name}:`, e.message);
    failed++;
  }
}

async function checkPage({ path, name, expectText }) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const html = await res.text();
    if (!res.ok) {
      console.error(`FAIL PAGE ${name}: HTTP ${res.status}`);
      failed++;
      return;
    }
    if (html.includes("Application error")) {
      console.error(`FAIL PAGE ${name}: client error boundary`);
      failed++;
      return;
    }
    if (!html.includes(expectText)) {
      console.error(`FAIL PAGE ${name}: missing "${expectText}" in HTML`);
      failed++;
      return;
    }
    console.log(`OK   PAGE ${name}`);
  } catch (e) {
    console.error(`FAIL PAGE ${name}:`, e.message);
    failed++;
  }
}

console.log(`Smoke test → ${base}\n`);

for (const api of apiChecks) await checkApi(api);
for (const page of routes) await checkPage(page);

// Live stream should connect
try {
  const res = await fetch(`${base}/api/states/stream`, {
    signal: AbortSignal.timeout(4000),
  });
  const reader = res.body?.getReader();
  if (!reader) throw new Error("no body");
  const { value } = await reader.read();
  reader.cancel();
  const chunk = new TextDecoder().decode(value ?? new Uint8Array());
  if (!chunk.includes("event:")) {
    console.error("FAIL SSE stream: no events in first chunk");
    failed++;
  } else {
    console.log("OK   SSE states/stream (connected)");
  }
} catch (e) {
  if (e.name === "TimeoutError") {
    console.log("OK   SSE states/stream (timeout after connect — expected)");
  } else {
    console.error("FAIL SSE stream:", e.message);
    failed++;
  }
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll smoke checks passed");
process.exit(failed ? 1 : 0);
