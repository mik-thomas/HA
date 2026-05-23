# HA Device Manager

Next.js full-stack app to **list**, **rename**, and **group** Home Assistant devices via areas.

## Physical device labels (QR)

Identify hardware with printable QR stickers:

1. **Labels** → **Generate codes for all devices** (or generate per device in the detail modal)
2. **Print labels** → stick on devices
3. On your phone, open **Scan** (same Wi‑Fi as this app) and scan the QR code
4. The matching device **blinks** in the list and opens its detail modal

Codes are stored in `data/device-barcodes.json` on the server (use a persistent volume on Railway).

## Features

- Browse all devices with search and area filter
- Rename devices (`name_by_user`) and assign areas
- Per-device entity list: rename entities, enable/disable
- Areas CRUD (create, rename, delete)
- **Automations** — list all automations with enabled/disabled/running status (live updates)

Uses Home Assistant WebSocket registry APIs and a long-lived access token.

## Local development

```bash
cd ha-device-manager
cp .env.example .env.local
# Edit .env.local: HA_URL and HA_TOKEN
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

### Smoke tests (run after changes)

```bash
npm run smoke          # API + HTML + live SSE
npm run smoke:browser  # Playwright UI checks + screenshots in .smoke-screenshots/
```

### "Internal Server Error" in the browser

Usually a stale Next.js cache or expired HA token:

```bash
npm run clean
npm run dev
```

Check HA connectivity: [http://localhost:3001/api/health](http://localhost:3001/api/health)

### Create a long-lived token

1. In Home Assistant: **Profile** → **Security** → **Long-Lived Access Tokens**
2. Create token named e.g. `HA Device Manager`
3. Paste into `HA_TOKEN` in `.env.local`

Do **not** commit `.env.local` or passwords to Git.

## Deploy on Railway (GitHub)

Repo layout: app is in **`ha-device-manager/`** (monorepo). Use **one** of these:

### Option A — Root directory (recommended)

1. [Railway](https://railway.app/) → your service → **Settings** → **Root Directory** → `ha-device-manager`
2. Redeploy. Build: `npm run build`, start: `npm start` (uses Railway `PORT` automatically).

### Option B — Deploy from repo root

Root `railway.toml` runs build/start inside `ha-device-manager/` — leave Root Directory empty.

### Variables (required)

| Variable | Example |
|----------|---------|
| `HA_URL` | `https://YOUR_INSTANCE.ui.nabu.casa` |
| `HA_TOKEN` | Long-lived token from HA Profile |

Health check uses `/api/ping` (app only). `/api/health` also tests HA once variables are set.

### Important: URL for Railway

`http://homeassistant.local:8123` only works on your LAN. For Railway you need one of:

- **Home Assistant Cloud** remote URL (`https://…ui.nabu.casa`)
- **Cloudflare Tunnel** / reverse proxy with HTTPS
- **Tailscale Funnel** or similar

Without a public/reachable URL, the cloud app cannot contact HA.

## Security

- Never commit tokens or passwords
- Restrict who can access the Railway app (Railway networking / auth proxy)
- Use a dedicated HA token with minimum scope you are comfortable with

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/devices` | GET | Full inventory |
| `/api/devices/[id]` | PATCH | Rename device, set area |
| `/api/entities/[entityId]` | PATCH | Rename entity, enable/disable |
| `/api/areas` | GET, POST | List / create areas |
| `/api/areas/[id]` | PATCH, DELETE | Rename / delete area |
