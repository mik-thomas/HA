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

1. Push this folder to a **new GitHub repository** (root = `ha-device-manager` contents).
2. [Railway](https://railway.app/) → **New Project** → **Deploy from GitHub repo**.
3. Set **Variables**:
   - `HA_URL` — must be reachable from Railway (see below)
   - `HA_TOKEN` — long-lived token
4. Railway auto-detects Next.js; build runs `npm run build`, start `npm run start`.

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
