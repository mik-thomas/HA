# Home Assistant — Michael Thomas

Workspace for Home Assistant automations, Lovelace dashboards, and the **HA Device Manager** web app.

## Contents

| Path | Description |
|------|-------------|
| [`ha-device-manager/`](ha-device-manager/) | Next.js app — device list, areas, organize, QR labels, power states |
| [`automations/`](automations/) | Automation definitions (YAML + JSON) |
| [`www/`](www/) | Static assets for Lovelace (floorplan SVG, CSS) |
| [`themes/`](themes/) | Custom themes |
| `build_*_dashboard.py` | Deploy / update Lovelace dashboards via WebSocket |
| `deploy_automation.py` | Push automations to HA |
| `devices.json`, `ha_device_inventory.json` | Device inventory exports |

## Device Manager (quick start)

```bash
cd ha-device-manager
cp .env.example .env.local   # set HA_URL and HA_TOKEN
npm install
npm run serve                # clean build + http://localhost:3001
```

See [ha-device-manager/README.md](ha-device-manager/README.md) for Railway deploy and tokens.

## Python scripts

Scripts expect a long-lived token at `/tmp/ha_token.txt` (not committed). Create one in Home Assistant → Profile → Security → Long-Lived Access Tokens.

```bash
echo 'YOUR_TOKEN' > /tmp/ha_token.txt
python3 build_home_dashboard.py
```

## Railway

Deploy the **ha-device-manager** service:

1. Railway → service **Settings** → **Root Directory** = `ha-device-manager`  
   **or** use root `railway.toml` (builds from monorepo root).
2. Set `HA_URL` and `HA_TOKEN` (see `ha-device-manager/README.md`).
3. `HA_URL` must be reachable from the cloud (not `homeassistant.local`).
