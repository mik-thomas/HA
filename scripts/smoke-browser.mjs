#!/usr/bin/env node
/**
 * Browser smoke test (Playwright). Run after UI changes.
 * BASE_URL=http://localhost:3001 node scripts/smoke-browser.mjs
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const outDir = resolve(__dirname, "../.smoke-screenshots");

const pages = [
  { path: "/", selector: "h1", expect: /Devices/i },
  { path: "/areas", selector: "h1", expect: /Areas/i },
  { path: "/automations", selector: "h1", expect: /Automations/i },
  { path: "/organize", selector: "h1", expect: /Areas|Organize/i },
  { path: "/labels", selector: "h1", expect: /Labels/i },
  { path: "/scan", selector: "h1", expect: /Scan/i },
];

mkdirSync(outDir, { recursive: true });

let failed = 0;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

page.on("pageerror", (err) => {
  console.error("PAGE ERROR:", err.message);
});

for (const { path, selector, expect } of pages) {
  const name = path === "/" ? "home" : path.slice(1);
  const url = `${base}${path}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2500);

    const body = await page.locator("body").innerText();
    if (body.includes("Application error")) {
      console.error(`FAIL ${name}: Application error on page`);
      failed++;
    } else if (body.includes("Could not reach Home Assistant")) {
      console.error(`FAIL ${name}: HA connection error`);
      failed++;
    } else {
      const heading = await page.locator(selector).first().innerText().catch(() => "");
      if (!expect.test(heading) && !expect.test(body)) {
        console.error(`FAIL ${name}: expected ${expect}, got heading "${heading.slice(0, 40)}"`);
        failed++;
      } else {
        console.log(`OK   ${name} — ${heading || path}`);
      }
    }

    await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage: false });
  } catch (e) {
    console.error(`FAIL ${name}:`, e.message);
    failed++;
  }
}

await browser.close();
console.log(failed ? `\n${failed} browser check(s) failed` : "\nBrowser smoke passed");
console.log(`Screenshots: ${outDir}`);
process.exit(failed ? 1 : 0);
