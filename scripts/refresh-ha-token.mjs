#!/usr/bin/env node
/**
 * Create a long-lived HA token and write to .env.local + /tmp/ha_token.txt
 *
 * Usage:
 *   HA_URL=http://homeassistant.local:8123 \
 *   HA_USERNAME=michael \
 *   HA_PASSWORD='your-password' \
 *   node scripts/refresh-ha-token.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const haUrl = (process.env.HA_URL ?? "http://homeassistant.local:8123").replace(/\/$/, "");
const username = process.env.HA_USERNAME;
const password = process.env.HA_PASSWORD;

if (!username || !password) {
  console.error("Set HA_USERNAME and HA_PASSWORD environment variables.");
  process.exit(1);
}

const clientId = "http://homeassistant.local:8123/";
const redirectUri = "http://homeassistant.local:8123/";

async function loginAccessToken() {
  const flowRes = await fetch(`${haUrl}/auth/login_flow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      redirect_uri: redirectUri,
      handler: ["homeassistant", null],
    }),
  });
  const flow = await flowRes.json();
  if (!flow.flow_id) throw new Error(`login_flow failed: ${JSON.stringify(flow)}`);

  const credRes = await fetch(`${haUrl}/auth/login_flow/${flow.flow_id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      username,
      password,
    }),
  });
  const cred = await credRes.json();
  if (cred.type !== "create_entry" || !cred.result) {
    throw new Error(`login failed: ${JSON.stringify(cred)}`);
  }

  const tokenRes = await fetch(`${haUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: cred.result,
      client_id: clientId,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    throw new Error(`token exchange failed: ${JSON.stringify(tokenJson)}`);
  }
  return tokenJson.access_token;
}

function wsUrl() {
  const u = new URL(haUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/api/websocket";
  return u.toString();
}

function createLongLivedToken(shortLivedToken) {
  return new Promise((resolve, reject) => {
    const ws = new globalThis.WebSocket(wsUrl());
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket timeout"));
    }, 30_000);

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.type === "auth_required") {
        ws.send(JSON.stringify({ type: "auth", access_token: shortLivedToken }));
        return;
      }
      if (msg.type === "auth_invalid") {
        clearTimeout(timeout);
        ws.close();
        reject(new Error("WebSocket auth invalid"));
        return;
      }
      if (msg.type === "auth_ok") {
        ws.send(
          JSON.stringify({
            id: 1,
            type: "auth/long_lived_access_token",
            client_name: "HA Device Manager",
            lifespan: 3650,
          }),
        );
        return;
      }
      if (msg.type === "result" && msg.id === 1) {
        clearTimeout(timeout);
        ws.close();
        if (!msg.success) reject(new Error(JSON.stringify(msg)));
        else resolve(msg.result);
      }
    });

    ws.addEventListener("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

function updateEnvFile(token) {
  const envPath = resolve(root, ".env.local");
  let content = "";
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    content = readFileSync(resolve(root, ".env.example"), "utf8");
  }
  const lines = content.split("\n").filter((line) => !line.startsWith("HA_TOKEN="));
  lines.push(`HA_TOKEN=${token}`);
  if (!lines.some((l) => l.startsWith("HA_URL="))) {
    lines.unshift(`HA_URL=${haUrl}`);
  }
  writeFileSync(envPath, `${lines.join("\n").trim()}\n`);
  writeFileSync("/tmp/ha_token.txt", `${token}\n`);
}

const short = await loginAccessToken();
const longLived = await createLongLivedToken(short);
updateEnvFile(longLived);

const check = await fetch(`${haUrl}/api/`, {
  headers: { Authorization: `Bearer ${longLived}` },
});
console.log(`Token OK — /api/ returned ${check.status}`);
console.log(`Updated ${resolve(root, ".env.local")} and /tmp/ha_token.txt`);
