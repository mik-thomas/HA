#!/usr/bin/env python3
"""
Build a Madelena-inspired maximalist Home Assistant dashboard with ALL devices.

Inspired by https://github.com/Madelena/hass-config-public
Uses built-in Lovelace cards (works without HACS). Optional HACS cards listed in
lovelace_resources_madelena.yaml for full floorplan / mushroom / button-card support.
"""

from __future__ import annotations

import asyncio
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

import websockets

from floorplan_map import build_map_view, load_map_image
from generate_house_map import build_floorplan_svg, build_svg
from madelena_home_view import build_madelena_home_view

ROOT = Path(__file__).parent
INVENTORY_PATH = ROOT / "ha_device_inventory.json"
URL_PATH = "home-control"
DASHBOARD_TITLE = "Home"
DASHBOARD_ICON = "mdi:home-analytics"
THEME = "Graphite"
HA_URL = "http://homeassistant.local:8123"
SVG_PATH = ROOT / "www" / "hue-house-3d.svg"
FLOORPLAN_CSS_PATH = ROOT / "www" / "ha-floorplan.css"

DOMAIN_ORDER = [
    "light",
    "scene",
    "switch",
    "binary_sensor",
    "sensor",
    "button",
    "cover",
    "climate",
    "fan",
    "media_player",
    "vacuum",
    "camera",
    "event",
    "number",
    "select",
    "update",
    "person",
    "device_tracker",
    "weather",
    "todo",
    "tts",
    "other",
]

DOMAIN_ICONS = {
    "light": "mdi:lightbulb-group",
    "scene": "mdi:palette",
    "switch": "mdi:power-socket",
    "binary_sensor": "mdi:motion-sensor",
    "sensor": "mdi:chart-line",
    "button": "mdi:gesture-tap-button",
    "cover": "mdi:window-shutter",
    "climate": "mdi:thermostat",
    "fan": "mdi:fan",
    "media_player": "mdi:cast",
    "vacuum": "mdi:robot-vacuum",
    "camera": "mdi:cctv",
    "event": "mdi:calendar-alert",
    "number": "mdi:numeric",
    "select": "mdi:format-list-bulleted",
    "update": "mdi:package-up",
    "person": "mdi:account",
    "device_tracker": "mdi:account-arrow-right",
    "weather": "mdi:weather-partly-cloudy",
    "todo": "mdi:clipboard-list",
    "tts": "mdi:text-to-speech",
    "other": "mdi:devices",
}


def fetch_states(token: str) -> dict[str, dict]:
    req = urllib.request.Request(
        f"{HA_URL}/api/states",
        headers={"Authorization": f"Bearer {token}"},
    )
    states = json.load(urllib.request.urlopen(req, timeout=30))
    return {s["entity_id"]: s for s in states}


def load_inventory() -> tuple[dict, dict[str, str], dict[str, dict]]:
    inv = json.loads(INVENTORY_PATH.read_text())
    devices = {d["id"]: d for d in inv["config/device_registry/list"]}
    areas = {a["area_id"]: a["name"] for a in inv["config/area_registry/list"]}
    return inv, areas, devices


def group_by_area(
    inv: dict, areas: dict[str, str], devices: dict[str, dict]
) -> dict[str, dict[str, list[str]]]:
    by_area: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))

    for ent in inv["config/entity_registry/list"]:
        eid = ent["entity_id"]
        domain = eid.split(".", 1)[0]
        bucket = DOMAIN_ORDER[-1] if domain not in DOMAIN_ORDER else domain
        if bucket == DOMAIN_ORDER[-1]:
            bucket = "other"

        area_name = "System & Other"
        did = ent.get("device_id")
        if did and devices.get(did, {}).get("area_id"):
            area_name = areas.get(devices[did]["area_id"], area_name)
        elif ent.get("area_id"):
            area_name = areas.get(ent["area_id"], area_name)

        by_area[area_name][bucket].append(eid)

    for area in by_area:
        for dom in by_area[area]:
            by_area[area][dom] = sorted(by_area[area][dom])

    return dict(sorted(by_area.items(), key=lambda x: (x[0] == "System & Other", x[0])))


def filter_existing(
    by_area: dict[str, dict[str, list[str]]], known: set[str]
) -> dict[str, dict[str, list[str]]]:
    out: dict[str, dict[str, list[str]]] = {}
    for area, domains in by_area.items():
        filtered: dict[str, list[str]] = {}
        for dom, ents in domains.items():
            live = [e for e in ents if e in known]
            if live:
                filtered[dom] = live
        if filtered:
            out[area] = filtered
    return out


def markdown_header(title: str, subtitle: str) -> dict:
    return {
        "type": "markdown",
        "content": (
            f"<div style='padding: 12px 4px 4px;'>"
            f"<div style='font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; "
            f"opacity: 0.55;'>{subtitle}</div>"
            f"<div style='font-size: 30px; font-weight: 300; line-height: 1.1;'>{title}</div>"
            f"</div>"
        ),
    }


def heading_card(heading: str, icon: str) -> dict:
    return {"type": "heading", "heading": heading, "icon": icon}


def entities_card(
    title: str,
    entities: list[str],
    *,
    toggle: bool = False,
    state_color: bool = True,
) -> dict:
    card: dict = {
        "type": "entities",
        "title": title,
        "show_header_toggle": toggle,
        "state_color": state_color,
        "entities": entities[:80],  # Lovelace perf guard
    }
    return card


def area_stack(area: str, domains: dict[str, list[str]]) -> dict:
    cards: list[dict] = [heading_card(area, "mdi:floor-plan")]
    for dom in DOMAIN_ORDER:
        if dom not in domains:
            continue
        ents = domains[dom]
        cards.append(
            entities_card(
                dom.replace("_", " ").title(),
                ents,
                toggle=(dom in ("light", "switch")),
                state_color=(dom in ("light", "switch", "binary_sensor", "sensor")),
            )
        )
    return {"type": "vertical-stack", "cards": cards}


def summary_stats(by_area: dict, states: dict[str, dict]) -> str:
    lights = [e for a in by_area.values() for e in a.get("light", [])]
    on = sum(1 for e in lights if states.get(e, {}).get("state") == "on")
    motion = [
        e
        for a in by_area.values()
        for e in a.get("binary_sensor", [])
        if "motion" in e or "presence" in e or "occupancy" in e
    ]
    active_motion = sum(1 for e in motion if states.get(e, {}).get("state") == "on")
    areas_n = len(by_area)
    devices_n = sum(len(d) for d in by_area.values() for _ in d.values())
    return (
        f"You have **{len(lights)}** lights — **{on}** on. "
        f"**{areas_n}** areas, **{devices_n}** entities on this dashboard. "
        f"Motion/presence: **{active_motion}** active of **{len(motion)}**."
    )


def summary_view(by_area: dict, states: dict[str, dict], map_view_cfg: dict) -> dict:
    # Re-use map panel cards from map view (first view's panel content)
    map_cards = map_view_cfg["cards"][0]["cards"]

    quick = []
    for area, primary in [
        ("Living Room", "light.living_room"),
        ("Kitchen", "light.kitchen"),
        ("Master Bedrrom", "light.master_bedrrom"),
        ("Outside", "light.outside"),
    ]:
        if primary in states:
            quick.append(
                {
                    "type": "tile",
                    "entity": primary,
                    "name": area,
                    "features": [{"type": "light-brightness"}],
                }
            )

    return {
        "title": "Summary",
        "path": "summary",
        "icon": "mdi:view-dashboard",
        "theme": THEME,
        "type": "sections",
        "max_columns": 2,
        "sections": [
            {
                "type": "grid",
                "columns": 1,
                "cards": [
                    markdown_header("Home", "Maximalist control center"),
                    {
                        "type": "markdown",
                        "content": summary_stats(by_area, states),
                    },
                ],
            },
            {"type": "grid", "columns": 1, "cards": map_cards[:2]},
            {
                "type": "grid",
                "columns": 3,
                "cards": quick,
            },
            {
                "type": "grid",
                "columns": 1,
                "cards": [
                    {
                        "type": "markdown",
                        "content": (
                            "**Madelena-style floorplan** (ha-floorplan + button-card) "
                            "is ready in `lovelace_resources_madelena.yaml` after you install "
                            "HACS frontend mods. See `MADELENA_SETUP.md`."
                        ),
                    }
                ],
            },
        ],
    }


def all_devices_view(by_area: dict) -> dict:
    """Dense grid of every area — like Madelena 'All Devices' / maximalist columns."""
    area_cards = [area_stack(area, domains) for area, domains in by_area.items()]
    cols = 2
    sections = [
        {
            "type": "grid",
            "columns": 1,
            "cards": [
                markdown_header("All Devices", "Every area · every entity"),
            ],
        }
    ]
    for i in range(0, len(area_cards), cols):
        sections.append(
            {
                "type": "grid",
                "columns": cols if len(area_cards[i : i + cols]) == cols else 1,
                "cards": area_cards[i : i + cols],
            }
        )
    return {
        "title": "All Devices",
        "path": "devices",
        "icon": "mdi:devices",
        "theme": THEME,
        "type": "sections",
        "max_columns": 2,
        "sections": sections,
    }


def domain_view(
    title: str,
    path: str,
    icon: str,
    by_area: dict,
    domains: set[str],
) -> dict:
    cards: list[dict] = [markdown_header(title, "Grouped by room")]
    for area, dom_map in by_area.items():
        ents: list[str] = []
        for d in domains:
            ents.extend(dom_map.get(d, []))
        if not ents:
            continue
        cards.append(entities_card(area, ents, toggle=("light" in domains)))
    return {
        "title": title,
        "path": path,
        "icon": icon,
        "theme": THEME,
        "type": "masonry",
        "cards": cards,
    }


def build_floorplan_ha_config(by_area: dict, states: set[str]) -> dict:
    """ha-floorplan-card config (works once HACS ha-floorplan is installed)."""
    rules: list[dict] = []
    area_primary = {
        "Living Room": "light.living_room",
        "Kitchen": "light.kitchen",
        "Master Bedrrom": "light.master_bedrrom",
        "Guest Room": "light.guest_room",
        "Garden": "light.garden",
        "Outside": "light.outside",
        "Cloak Room": "light.cloak_room",
        "Stairway": "light.stairway",
        "Study Lamp": "light.study_lamp",
        "Troff": "light.troff",
        "Kitchen Spots": "light.kitchen_spots",
    }
    for area, entity in area_primary.items():
        if entity not in states:
            continue
        slug = area.lower().replace(" ", "_").replace("&", "and")
        rules.append(
            {
                "entity": entity,
                "element": f"area.{slug}.bg",
                "state_action": {
                    "action": "call-service",
                    "service": "floorplan.class_set",
                    "service_data": {
                        "class": '${(entity.state === "on") ? "bg-on" : "bg-off"}',
                    },
                },
                "tap_action": {"action": "toggle"},
            }
        )
    return {
        "image": {"location": "/local/home-floorplan.svg", "cache": False},
        "stylesheet": "/local/ha-floorplan.css",
        "defaults": {"hover_action": "hover-info", "tap_action": "more-info"},
        "rules": rules,
    }


def floorplan_view(map_view: dict, by_area: dict, known: set[str]) -> dict:
    """HA Floorplan when installed; otherwise fallback to 3D picture-elements map."""
    cards: list[dict] = [
        markdown_header("Floor Plan", "Axonometric · Madelena style"),
    ]
    if _hacs_file_exists("/hacsfiles/ha-floorplan/floorplan.js"):
        cards.append(
            {
                "type": "custom:floorplan-card",
                "config": build_floorplan_ha_config(by_area, known),
            }
        )
    else:
        cards.extend(map_view["cards"][0]["cards"] if map_view.get("cards") else [])
    return {
        "title": "Floor Plan",
        "path": "floorplan",
        "icon": "mdi:floor-plan",
        "theme": THEME,
        "type": "panel",
        "cards": [{"type": "vertical-stack", "cards": cards}],
    }


def _hacs_file_exists(path: str) -> bool:
    import urllib.request

    try:
        req = urllib.request.Request(f"{HA_URL}{path}", method="HEAD")
        return urllib.request.urlopen(req, timeout=3).status == 200
    except Exception:
        return False


def build_config(token: str) -> dict:
    inv, areas, devices = load_inventory()
    states = fetch_states(token)
    known = set(states)
    by_area = filter_existing(group_by_area(inv, areas, devices), known)

    # 3D map from lights in each area
    map_areas = defaultdict(
        lambda: {"lights": [], "scenes": [], "motion": [], "sensors": [], "switches": [], "other": []}
    )
    for area, doms in by_area.items():
        for e in doms.get("light", []):
            map_areas[area]["lights"].append({"entity": e})
    friendly = {eid: states[eid]["attributes"].get("friendly_name", eid) for eid in known}
    from build_hue_dashboard import ZONE_PRIMARY

    map_view = build_map_view(map_areas, friendly, ZONE_PRIMARY, HA_URL, known)
    (ROOT / "floorplan_ha_config.json").write_text(
        json.dumps(build_floorplan_ha_config(by_area, known), indent=2)
    )

    use_floorplan = _hacs_file_exists("/hacsfiles/ha-floorplan/floorplan.js")
    views = [
        build_madelena_home_view(
            states,
            build_floorplan_ha_config(by_area, known),
            map_view,
            use_floorplan=use_floorplan,
        ),
        summary_view(by_area, states, map_view),
        all_devices_view(by_area),
        domain_view("Lights", "lights", "mdi:lightbulb-group", by_area, {"light"}),
        domain_view("Scenes", "scenes", "mdi:palette-swatch", by_area, {"scene"}),
        domain_view(
            "Sensors",
            "sensors",
            "mdi:access-point-network",
            by_area,
            {"sensor", "binary_sensor"},
        ),
        domain_view("Switches", "switches", "mdi:light-switch", by_area, {"switch", "button"}),
        {**map_view, "title": "3D Map", "path": "map"},
        floorplan_view(map_view, by_area, known),
    ]

    return {"title": DASHBOARD_TITLE, "views": views}




async def deploy(token: str, config: dict) -> None:
    uri = "ws://homeassistant.local:8123/api/websocket"

    async def call(ws, msg_id: int, payload: dict) -> dict:
        await ws.send(json.dumps({**payload, "id": msg_id}))
        while True:
            r = json.loads(await ws.recv())
            if r.get("id") == msg_id:
                return r

    async with websockets.connect(uri) as ws:
        await ws.recv()
        await ws.send(json.dumps({"type": "auth", "access_token": token}))
        if json.loads(await ws.recv()).get("type") != "auth_ok":
            raise RuntimeError("Auth failed")

        dashboards = await call(ws, 1, {"type": "lovelace/dashboards/list"})
        existing = {d["url_path"]: d for d in dashboards.get("result", []) if isinstance(d, dict)}

        if URL_PATH not in existing:
            created = await call(
                ws,
                2,
                {
                    "type": "lovelace/dashboards/create",
                    "url_path": URL_PATH,
                    "title": DASHBOARD_TITLE,
                    "icon": DASHBOARD_ICON,
                    "show_in_sidebar": True,
                },
            )
            if not created.get("success"):
                raise RuntimeError(f"Create failed: {created}")

        saved = await call(
            ws,
            3,
            {"type": "lovelace/config/save", "url_path": URL_PATH, "config": config},
        )
        if not saved.get("success"):
            raise RuntimeError(f"Save failed: {saved}")
        print(f"Deployed {len(config['views'])} views → /{URL_PATH}")


def main() -> None:
    SVG_PATH.parent.mkdir(parents=True, exist_ok=True)
    SVG_PATH.write_text(build_svg(show_header=True))
    (ROOT / "www" / "hue-house-home.svg").write_text(build_svg(show_header=False))
    (ROOT / "www" / "home-floorplan.svg").write_text(build_floorplan_svg())
    FLOORPLAN_CSS_PATH.write_text(
        (ROOT / "www" / "ha-floorplan.css").read_text()
        if (ROOT / "www" / "ha-floorplan.css").exists()
        else _default_floorplan_css()
    )

    token = Path("/tmp/ha_token.txt").read_text().strip()
    config = build_config(token)
    (ROOT / "home_dashboard_config.json").write_text(json.dumps(config, indent=2))
    print(f"Wrote {ROOT / 'home_dashboard_config.json'}")
    asyncio.run(deploy(token, config))


def _default_floorplan_css() -> str:
    return """.fp-profile,.fp-line { stroke-miterlimit:10; }
.fp-bg { fill:var(--primary-background-color); }
.icon,.tile-text,.group-name-text { fill:var(--primary-text-color); }
.bg-off { fill:var(--primary-text-color); opacity:.125; }
.bg-on { fill:var(--primary-color); }
.bg-urgent { fill: var(--error-color); }
.tile-text { font-size:56px; font-family:var(--paper-font-common-family); font-weight:600; text-transform:uppercase; }
"""


if __name__ == "__main__":
    main()
