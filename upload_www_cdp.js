#!/usr/bin/env node
/**
 * Upload www assets via File editor api/save using Playwright CDP.
 * Requires: npx playwright (chromium) and an open HA File editor tab in the default browser profile.
 *
 * Fallback: run step scripts from .cdp_b64_steps via evaluate if CDP URL is provided.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const HA_URL = process.env.HA_URL || "http://homeassistant.local:8123/core_configurator";
const CDP_URL = process.env.CDP_URL || process.env.BROWSER_CDP_URL;

async function uploadViaPlaywright() {
  const { chromium } = require("playwright");
  const browser = CDP_URL
    ? await chromium.connectOverCDP(CDP_URL)
    : await chromium.launch({ headless: false });
  const context = browser.contexts()[0] || (await browser.newContext());
  let page = context.pages().find((p) => p.url().includes("core_configurator"));
  if (!page) {
    page = await context.newPage();
    await page.goto(HA_URL, { waitUntil: "networkidle", timeout: 120000 });
  }
  const frame = page.frames().find((f) => f.url().includes("hassio_ingress"));
  if (!frame) throw new Error("File editor iframe not found");
  const run = (expr) => frame.evaluate(expr);

  for (const dir of ["hue-house-3d_svg", "home-floorplan_svg"]) {
    const stepsDir = path.join(ROOT, ".cdp_b64_steps", dir);
    const steps = fs
      .readdirSync(stepsDir)
      .filter((f) => f.startsWith("step_"))
      .sort();
    for (const step of steps) {
      const code = fs.readFileSync(path.join(stepsDir, step), "utf8");
      await run(code);
    }
    const save = fs.readFileSync(path.join(stepsDir, "step_" + String(steps.length - 1).padStart(2, "0") + ".js"), "utf8");
    if (save.includes("api/save")) {
      const result = await run(`return (${save})()`);
      console.log(dir, result);
    }
  }

  const css = fs.readFileSync(path.join(ROOT, "www", "ha-floorplan.css"), "utf8");
  const cssResult = await run(`(async () => {
    const body = new URLSearchParams({ filename: 'www/ha-floorplan.css', text: ${JSON.stringify(css)} });
    const r = await fetch('api/save', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    return { status: r.status, body: await r.text() };
  })()`);
  console.log("ha-floorplan.css", cssResult);

  if (!CDP_URL) await browser.close();
}

uploadViaPlaywright().catch((err) => {
  console.error(err);
  process.exit(1);
});
