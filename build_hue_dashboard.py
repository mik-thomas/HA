#!/usr/bin/env python3
"""Build and deploy a premium Home Assistant Lovelace dashboard for Hue devices."""

from __future__ import annotations

import asyncio
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

import websockets

from floorplan_map import build_map_view
from generate_house_map import build_svg

DEVICES_PATH = Path(__file__).parent / "devices.json"
SVG_PATH = Path(__file__).parent / "www" / "hue-house-3d.svg"
URL_PATH = "hue-devices"
DASHBOARD_TITLE = "Hue Control"
DASHBOARD_ICON = "mdi:lightbulb-group-outline"
THEME = "Graphite"
HA_URL = "http://homeassistant.local:8123"

AREA_ORDER = [
    "Living Room",
    "Kitchen",
    "Kitchen Spots",
    "Master Bedrrom",
    "Outside",
    "Garden",
    "Guest Room",
    "Stairway",
    "Study Lamp",
    "Cloak Room",
    "Troff",
    "Overtable",
    "System & Unassigned",
]

# Moody interior photography for room hero panels
AREA_ART: dict[str, str] = {
    "Living Room": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=80",
    "Kitchen": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1400&q=80",
    "Kitchen Spots": "https://images.unsplash.com/photo-1565538810644-b5bdbbde057a?auto=format&fit=crop&w=1400&q=80",
    "Master Bedrrom": "https://images.unsplash.com/photo-1616594039964-4088a3a0e027?auto=format&fit=crop&w=1400&q=80",
    "Outside": "https://images.unsplash.com/photo-1513836279014-a89f7a68ae07?auto=format&fit=crop&w=1400&q=80",
    "Garden": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1400&q=80",
    "Guest Room": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1400&q=80",
    "Stairway": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80",
    "Study Lamp": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80",
    "Cloak Room": "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1400&q=80",
    "Troff": "https://images.unsplash.com/photo-1469796466315-4fa8bc98e111?auto=format&fit=crop&w=1400&q=80",
    "Overtable": "https://images.unsplash.com/photo-1618221195710-e326b3a447f9?auto=format&fit=crop&w=1400&q=80",
    "System & Unassigned": "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&w=1400&q=80",
}

AREA_ICONS: dict[str, str] = {
    "Living Room": "mdi:sofa-outline",
    "Kitchen": "mdi:silverware-fork-knife",
    "Kitchen Spots": "mdi:spotlight-beam",
    "Master Bedrrom": "mdi:bed-king-outline",
    "Outside": "mdi:home-lightning-bolt-outline",
    "Garden": "mdi:flower-outline",
    "Guest Room": "mdi:account-multiple-outline",
    "Stairway": "mdi:stairs",
    "Study Lamp": "mdi:desk-lamp",
    "Cloak Room": "mdi:hanger",
    "Troff": "mdi:water-outline",
    "Overtable": "mdi:table-furniture",
    "System & Unassigned": "mdi:bridge",
}

ZONE_PRIMARY: dict[str, str] = {
    "Living Room": "light.living_room",
    "Kitchen": "light.kitchen",
    "Kitchen Spots": "light.kitchen_spots",
    "Master Bedrrom": "light.master_bedrrom",
    "Outside": "light.outside",
    "Garden": "light.garden",
    "Guest Room": "light.guest_room",
    "Stairway": "light.stairway",
    "Study Lamp": "light.study_lamp",
    "Cloak Room": "light.cloak_room",
    "Troff": "light.troff",
    "Overtable": "light.overtable",
    "System & Unassigned": "light.house_daylight_running",
}


def parse_entity(raw: str) -> str:
    match = re.match(r"^([a-z_]+\.[a-z0-9_]+)", raw)
    return match.group(1) if match else raw.split()[0]


def fetch_friendly_names(token: str) -> dict[str, str]:
    req = urllib.request.Request(
        f"{HA_URL}/api/states",
        headers={"Authorization": f"Bearer {token}"},
    )
    states = json.load(urllib.request.urlopen(req, timeout=20))
    return {
        s["entity_id"]: s["attributes"].get("friendly_name", s["entity_id"])
        for s in states
    }


def scene_icon(name: str) -> str:
    lower = name.lower()
    mapping = [
        (("relax", "rest", "evening"), "mdi:weather-night"),
        (("read", "concentrate"), "mdi:book-open-page-variant"),
        (("energ", "bright", "day"), "mdi:white-balance-sunny"),
        (("dim", "night"), "mdi:brightness-4"),
        (("red", "orange", "purple", "yellow", "blue", "amber"), "mdi:palette"),
        (("party", "glitz", "motown", "cody"), "mdi:disco-ball"),
        (("bloom",), "mdi:flower"),
    ]
    for keywords, icon in mapping:
        if any(k in lower for k in keywords):
            return icon
    return "mdi:palette-swatch-variant"


def hero_markdown() -> dict:
    return {
        "type": "markdown",
        "content": (
            "<div style='padding: 28px 8px 8px;'>"
            "<div style='font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; "
            "opacity: 0.55; margin-bottom: 8px;'>Philips Hue</div>"
            "<div style='font-size: 34px; font-weight: 300; line-height: 1.1; margin-bottom: 10px;'>"
            "Lighting Control Center</div>"
            "<div style='font-size: 14px; opacity: 0.7; max-width: 520px;'>"
            "Room scenes, ambience, and every Hue light — designed as a single premium panel."
            "</div></div>"
        ),
    }


def picture_hero(area: str, primary: str | None, friendly: dict[str, str]) -> dict:
    image = AREA_ART.get(area, AREA_ART["System & Unassigned"])
    icon = AREA_ICONS.get(area, "mdi:lightbulb-group")
    elements: list[dict] = [
        {
            "type": "icon",
            "icon": icon,
            "style": {
                "top": "16%",
                "left": "5%",
                "color": "white",
                "--mdc-icon-size": "34px",
                "filter": "drop-shadow(0 2px 8px rgba(0,0,0,0.45))",
            },
        },
    ]
    if primary:
        elements.extend(
            [
                {
                    "type": "state-label",
                    "entity": primary,
                    "prefix": " ",
                    "style": {
                        "top": "62%",
                        "left": "5%",
                        "color": "white",
                        "font-size": "15px",
                        "text-shadow": "0 2px 12px rgba(0,0,0,0.6)",
                    },
                },
                {
                    "type": "service-button",
                    "title": "Toggle room",
                    "service": "light.toggle",
                    "service_data": {"entity_id": primary},
                    "icon": "mdi:power",
                    "style": {
                        "top": "72%",
                        "right": "5%",
                        "background": "rgba(255,255,255,0.14)",
                        "border-radius": "14px",
                        "padding": "10px 14px",
                        "color": "white",
                        "backdrop-filter": "blur(8px)",
                        "--mdc-icon-button-size": "40px",
                    },
                },
                {
                    "type": "service-button",
                    "title": "Bright",
                    "service": "light.turn_on",
                    "service_data": {"entity_id": primary, "brightness_pct": 100},
                    "icon": "mdi:brightness-7",
                    "style": {
                        "top": "72%",
                        "right": "18%",
                        "background": "rgba(255,255,255,0.1)",
                        "border-radius": "14px",
                        "padding": "10px 14px",
                        "color": "white",
                        "backdrop-filter": "blur(8px)",
                    },
                },
                {
                    "type": "service-button",
                    "title": "Dim",
                    "service": "light.turn_on",
                    "service_data": {"entity_id": primary, "brightness_pct": 25},
                    "icon": "mdi:brightness-4",
                    "style": {
                        "top": "72%",
                        "right": "31%",
                        "background": "rgba(255,255,255,0.1)",
                        "border-radius": "14px",
                        "padding": "10px 14px",
                        "color": "white",
                        "backdrop-filter": "blur(8px)",
                    },
                },
            ]
        )
    return {
        "type": "picture-elements",
        "image": image,
        "title": area,
        "aspect_ratio": "21:9",
        "darken_image": True,
        "elements": elements,
    }


def light_grid(lights: list[str], friendly: dict[str, str], columns: int = 2) -> dict:
    cards = [
        {
            "type": "light",
            "entity": entity_id,
            "name": friendly.get(entity_id, entity_id),
            "show_name": True,
            "use_light_color": True,
        }
        for entity_id in lights
    ]
    return {"type": "grid", "columns": columns, "square": False, "cards": cards}


def scene_grid(scenes: list[str], friendly: dict[str, str], columns: int = 4) -> dict:
    cards = []
    for entity_id in scenes:
        label = friendly.get(entity_id, entity_id.split(".")[-1].replace("_", " ").title())
        short = label.split(" ", 1)[-1] if " " in label else label
        cards.append(
            {
                "type": "button",
                "name": short[:22],
                "icon": scene_icon(label),
                "show_name": True,
                "show_icon": True,
                "tap_action": {
                    "action": "call_service",
                    "service": "scene.turn_on",
                    "target": {"entity_id": entity_id},
                },
                "hold_action": {"action": "more-info", "entity": entity_id},
            }
        )
    return {"type": "grid", "columns": columns, "square": False, "cards": cards}


def sensor_glance(sensors: list[str], friendly: dict[str, str]) -> dict:
    entities = []
    for entity_id in sensors[:8]:
        entities.append(
            {
                "entity": entity_id,
                "name": friendly.get(entity_id, entity_id),
            }
        )
    return {
        "type": "glance",
        "title": "Sensors",
        "show_name": True,
        "show_icon": True,
        "state_color": True,
        "entities": entities,
    }


def room_panel(area: str, data: dict, friendly: dict[str, str]) -> dict:
    lights = [e["entity"] for e in data["lights"]]
    scenes = [e["entity"] for e in data["scenes"]]
    sensors = [e["entity"] for e in data["motion"] + data["sensors"]]
    switches = [e["entity"] for e in data["switches"]]

    primary = ZONE_PRIMARY.get(area)
    if primary not in lights:
        primary = lights[0] if lights else None

    accent_lights = [lid for lid in lights if lid != primary]

    stack_cards: list[dict] = [picture_hero(area, primary, friendly)]

    if accent_lights:
        stack_cards.append({"type": "heading", "heading": "Fixtures", "icon": "mdi:lightbulb-multiple-outline"})
        stack_cards.append(
            light_grid(accent_lights, friendly, columns=2 if len(accent_lights) > 1 else 1)
        )

    if scenes:
        stack_cards.append({"type": "heading", "heading": "Scenes", "icon": "mdi:palette-swatch"})
        stack_cards.append(scene_grid(scenes, friendly, columns=4 if len(scenes) >= 4 else 3))

    if sensors:
        stack_cards.append(sensor_glance(sensors, friendly))

    if switches:
        stack_cards.append(
            {
                "type": "entities",
                "title": "Controls",
                "show_header_toggle": False,
                "entities": switches,
            }
        )

    return {
        "type": "vertical-stack",
        "cards": stack_cards,
    }


def command_center_view(areas: dict, friendly: dict[str, str]) -> dict:
    quick_zones = [
        a
        for a in [
            "Living Room",
            "Kitchen",
            "Master Bedrrom",
            "Outside",
            "Garden",
            "Guest Room",
        ]
        if a in areas
    ]

    zone_tiles = []
    for area in quick_zones:
        primary = ZONE_PRIMARY.get(area)
        lights = [e["entity"] for e in areas[area]["lights"]]
        if primary not in lights and lights:
            primary = lights[0]
        if not primary:
            continue
        zone_tiles.append(
            {
                "type": "tile",
                "entity": primary,
                "name": area,
                "icon": AREA_ICONS.get(area, "mdi:lightbulb"),
                "vertical": False,
                "features": [{"type": "light-brightness"}],
            }
        )

    cards: list[dict] = [
        hero_markdown(),
        {"type": "heading", "heading": "Quick zones", "icon": "mdi:view-dashboard-outline"},
        {"type": "grid", "columns": 3, "square": False, "cards": zone_tiles},
    ]

    # Featured wide panels for main living spaces
    for featured in ["Living Room", "Kitchen"]:
        if featured in areas:
            cards.append(room_panel(featured, areas[featured], friendly))

    return {
        "title": "Command",
        "path": "command",
        "icon": "mdi:tune-vertical",
        "theme": THEME,
        "type": "masonry",
        "cards": cards,
    }


def rooms_view(areas: dict, friendly: dict[str, str]) -> dict:
    ordered = [a for a in AREA_ORDER if a in areas]
    ordered += sorted(set(areas) - set(ordered))

    sections = [
        {"type": "grid", "columns": 1, "cards": [hero_markdown()]},
    ]

    room_cards = [room_panel(area, areas[area], friendly) for area in ordered]
    # Two-column room layout
    for i in range(0, len(room_cards), 2):
        pair = room_cards[i : i + 2]
        sections.append(
            {
                "type": "grid",
                "columns": 2 if len(pair) == 2 else 1,
                "cards": pair,
            }
        )

    return {
        "title": "Rooms",
        "path": "rooms",
        "icon": "mdi:floor-plan",
        "theme": THEME,
        "type": "sections",
        "max_columns": 2,
        "sections": sections,
    }


def scenes_view(areas: dict, friendly: dict[str, str]) -> dict:
    cards: list[dict] = [
        {
            "type": "markdown",
            "content": (
                "<div style='padding: 20px 8px 4px;'>"
                "<div style='font-size: 28px; font-weight: 300;'>Scene Gallery</div>"
                "<div style='font-size: 13px; opacity: 0.65;'>Tap a preset to transform the room.</div>"
                "</div>"
            ),
        }
    ]

    ordered = [a for a in AREA_ORDER if a in areas]
    ordered += sorted(set(areas) - set(ordered))

    for area in ordered:
        scenes = [e["entity"] for e in areas[area]["scenes"]]
        if not scenes:
            continue
        cards.append(
            {
                "type": "vertical-stack",
                "cards": [
                    {
                        "type": "markdown",
                        "content": f"### {area}",
                    },
                    scene_grid(scenes, friendly, columns=5 if len(scenes) >= 5 else 4),
                ],
            }
        )

    return {
        "title": "Scenes",
        "path": "scenes",
        "icon": "mdi:palette-swatch-variant",
        "theme": THEME,
        "type": "masonry",
        "cards": cards,
    }


def build_config(token: str) -> dict:
    devices = json.loads(DEVICES_PATH.read_text())
    hue_devices = [d for d in devices if d["integration"] == "hue"]
    friendly = fetch_friendly_names(token)
    known_entities = set(friendly)

    areas: dict[str, dict] = defaultdict(
        lambda: {
            "lights": [],
            "scenes": [],
            "motion": [],
            "sensors": [],
            "switches": [],
            "other": [],
        }
    )

    for device in sorted(hue_devices, key=lambda d: (d["area"] or "ZZZ", d["name"])):
        area = device["area"] or "System & Unassigned"
        for raw in device["entities"]:
            entity_id = parse_entity(raw)
            domain = entity_id.split(".", 1)[0]
            entry = {"entity": entity_id, "name": device["name"]}
            bucket = areas[area]
            if domain == "light":
                bucket["lights"].append(entry)
            elif domain == "scene":
                bucket["scenes"].append(entry)
            elif domain == "binary_sensor":
                bucket["motion"].append(entry)
            elif domain == "sensor":
                bucket["sensors"].append(entry)
            elif domain in ("switch", "button"):
                bucket["switches"].append(entry)
            else:
                bucket["other"].append(entry)

    # Drop stale entity IDs so cards don't show "Entity not found"
    for area in areas.values():
        for key in ("lights", "scenes", "motion", "sensors", "switches", "other"):
            if key in ("lights", "scenes"):
                area[key] = [e for e in area[key] if e["entity"] in known_entities]
            elif key == "other":
                area[key] = [e for e in area[key] if e.get("entity") in known_entities]
            else:
                area[key] = [e for e in area[key] if e["entity"] in known_entities]

    return {
        "title": DASHBOARD_TITLE,
        "views": [
            build_map_view(areas, friendly, ZONE_PRIMARY, HA_URL, known_entities),
            command_center_view(areas, friendly),
            rooms_view(areas, friendly),
            scenes_view(areas, friendly),
        ],
    }


async def deploy(token: str, config: dict) -> None:
    uri = "ws://homeassistant.local:8123/api/websocket"

    async def call(ws, msg_id: int, payload: dict) -> dict:
        await ws.send(json.dumps({**payload, "id": msg_id}))
        while True:
            response = json.loads(await ws.recv())
            if response.get("id") == msg_id:
                return response

    async with websockets.connect(uri) as ws:
        await ws.recv()
        await ws.send(json.dumps({"type": "auth", "access_token": token}))
        auth = json.loads(await ws.recv())
        if auth.get("type") != "auth_ok":
            raise RuntimeError(f"Auth failed: {auth}")

        dashboards = await call(ws, 1, {"type": "lovelace/dashboards/list"})
        existing = {
            d["url_path"]: d
            for d in dashboards.get("result", [])
            if isinstance(d, dict)
        }

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
                raise RuntimeError(f"Create dashboard failed: {created}")

        saved = await call(
            ws,
            3,
            {
                "type": "lovelace/config/save",
                "url_path": URL_PATH,
                "config": config,
            },
        )
        if not saved.get("success"):
            raise RuntimeError(f"Save config failed: {saved}")
        print(f"Deployed {len(config['views'])} views to /{URL_PATH}")


def main() -> None:
    SVG_PATH.parent.mkdir(parents=True, exist_ok=True)
    SVG_PATH.write_text(build_svg())
    print(f"Regenerated map {SVG_PATH}")

    token = Path("/tmp/ha_token.txt").read_text().strip()
    config = build_config(token)
    out = Path(__file__).parent / "hue_dashboard_config.json"
    out.write_text(json.dumps(config, indent=2))
    print(f"Wrote {out}")
    asyncio.run(deploy(token, config))


if __name__ == "__main__":
    main()
