# Install everything for Madelena-style dashboard

Do these steps once in Home Assistant (about 10 minutes). After that, run the deploy script at the bottom.

## Step 1 — HACS custom repositories (optional shortcut)

**HACS** → **⋮** (top right) → **Custom repositories** → add each URL with category **Lovelace**:

| Repository URL | Category |
|----------------|----------|
| `https://github.com/piitaya/lovelace-mushroom` | Lovelace |
| `https://github.com/custom-cards/button-card` | Lovelace |
| `https://github.com/thomasloven/lovelace-card-mod` | Lovelace |
| `https://github.com/thomasloven/lovelace-layout-card` | Lovelace |
| `https://github.com/thomasloven/lovelace-auto-entities` | Lovelace |
| `https://github.com/custom-cards/decluttering-card` | Lovelace |
| `https://github.com/kalkih/mini-graph-card` | Lovelace |
| `https://github.com/ExperienceLovelace/ha-floorplan` | Lovelace |

## Step 2 — Download frontend cards

**HACS** → open **⋮** → ensure you are on **Frontend** (not Integrations).  
Use **Filters** → type **Dashboard** if needed.

Search and **Download** each (ignore themes/slider variants):

1. **Mushroom** / Mushroom Cards  
2. **button-card** (custom-cards — description mentions `custom:button-card`)  
3. **card-mod**  
4. **layout-card**  
5. **auto-entities**  
6. **decluttering-card**  
7. **mini-graph-card**  
8. **HA Floorplan** (ExperienceLovelace)

After each download, use **Back** and search the next one.

## Step 3 — Copy map files to Home Assistant

**File editor** (sidebar) → open or create folder **`www`** → upload from your Mac:

From `Home Assistant/www/` on this machine:

- `hue-house-3d.svg`
- `home-floorplan.svg`
- `ha-floorplan.css`

Paths on the server: `/config/www/…` → served as `/local/…`

## Step 4 — Register Lovelace resources

On your Mac (in this folder):

```bash
python3 add_lovelace_resources.py
```

Or manually: **Settings** → **Dashboards** → **Resources** → **Add resource** for each line in `lovelace_resources_madelena.json`.

## Step 5 — Redeploy dashboards

```bash
python3 build_home_dashboard.py
python3 build_hue_dashboard.py
```

**Hard-refresh** the browser (Cmd+Shift+R) on:

- [http://homeassistant.local:8123/home-control/summary](http://homeassistant.local:8123/home-control/summary)
- [http://homeassistant.local:8123/hue-devices/map](http://homeassistant.local:8123/hue-devices/map)

## Verify

In browser devtools or a new tab, these should return **200** (not 404):

- `/hacsfiles/lovelace-mushroom/mushroom.js`
- `/hacsfiles/button-card/button-card.js`
- `/hacsfiles/ha-floorplan/floorplan.js`
- `/local/ha-floorplan.css`

## Already done for you

- **Home** dashboard with all devices: `/home-control`
- **Hue Control** dashboard: `/hue-devices`
- `floorplan_ha_config.json` — HA Floorplan rules (used when card is installed)
- Madelena `ha-floorplan.css` in `www/`
