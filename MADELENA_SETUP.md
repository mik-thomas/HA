# Madelena-style setup

Based on [Madelena/hass-config-public](https://github.com/Madelena/hass-config-public).

## What’s deployed

- **Home** dashboard → `/home-control` (sidebar: **Home**)
- **All 1,177 entities** grouped by **room/area** and **domain** (lights, scenes, sensors, switches, …)
- **3D isometric map** with tap-to-toggle lights
- Files in `www/` for floorplan: `home-floorplan.svg`, `ha-floorplan.css`, `hue-house-3d.svg`

Redeploy anytime:

```bash
python3 "/Users/michaelthomas/Home Assistant/build_home_dashboard.py"
```

## HACS frontend mods (optional, for full Madelena look)

Install from **HACS → Frontend**:

| Card | HACS name |
|------|-----------|
| Mushroom | Mushroom Cards |
| button-card | Button Card |
| card-mod | card-mod |
| layout-card | Layout Card |
| auto-entities | auto-entities |
| decluttering-card | Decluttering Card |
| mini-graph-card | mini-graph-card |
| ha-floorplan | HA Floorplan |

Then add resources from `lovelace_resources_madelena.yaml` (Settings → Dashboards → Resources), or run:

```bash
python3 "/Users/michaelthomas/Home Assistant/add_lovelace_resources.py"
```

Copy `www/*` into Home Assistant **File editor** → `/config/www/` so `/local/home-floorplan.svg` loads.

## Upload www files

In **File editor**, create `/config/www/` and upload:

- `hue-house-3d.svg`
- `home-floorplan.svg`
- `ha-floorplan.css`
