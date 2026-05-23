#!/usr/bin/env python3
"""3D isometric house map view for the Hue Lovelace dashboard."""

from __future__ import annotations

import base64
import math
from pathlib import Path
from urllib.parse import quote

SVG_PATH = Path(__file__).parent / "www" / "hue-house-3d.svg"

# Screen positions (% from top-left) aligned to the generated isometric artwork
AREA_CENTERS: dict[str, tuple[float, float]] = {
    "Living Room": (38.8, 37.5),
    "Kitchen": (60.5, 53.8),
    "Kitchen Spots": (71.0, 42.4),
    "Master Bedrrom": (40.7, 33.1),
    "Outside": (24.3, 27.3),
    "Garden": (70.3, 30.7),
    "Guest Room": (32.3, 53.6),
    "Stairway": (43.5, 62.5),
    "Study Lamp": (54.2, 71.8),
    "Cloak Room": (20.8, 43.1),
    "Troff": (28.5, 70.5),
    "Overtable": (54.7, 29.5),
    "System & Unassigned": (84.1, 57.6),
}

# Extra offsets for exterior / duplicate outside lights
ENTITY_OVERRIDES: dict[str, tuple[float, float]] = {
    "light.outside": (24.3, 27.3),
    "light.porch_1": (88.0, 48.0),
    "light.porch_2": (88.0, 56.0),
    "light.outside_light": (70.3, 30.7),
    "light.side_1": (18.0, 22.0),
    "light.side_2": (18.0, 28.0),
    "light.side_3": (18.0, 34.0),
    "light.side_4": (18.0, 40.0),
    "light.side_5": (18.0, 46.0),
    "light.side_6": (90.0, 34.0),
    "light.side_7": (90.0, 48.0),
    "light.side_8": (90.0, 62.0),
    "light.hue_lightstrip_outdoor_2": (32.0, 74.0),
    "light.troff": (28.5, 70.5),
    "light.stairway": (43.5, 60.0),
    "light.stairway_2": (46.0, 64.0),
    "light.hue_ambiance_spot_1": (68.0, 38.0),
    "light.hue_ambiance_spot_2": (72.0, 40.0),
    "light.hue_ambiance_spot_3": (76.0, 38.0),
    "light.hue_ambiance_spot_4": (80.0, 40.0),
    "light.house_daylight_running": (84.1, 57.6),
    "light.kitchen_2": (64.0, 50.0),
}


def _local_svg_url(ha_url: str, filename: str) -> str | None:
    import urllib.request

    local_url = f"{ha_url}/local/{filename}"
    try:
        req = urllib.request.Request(local_url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200 and int(resp.headers.get("Content-Length", "1")) > 500:
                return f"/local/{filename}"
    except Exception:
        pass
    return None


def load_map_image(ha_url: str = "http://homeassistant.local:8123") -> str:
    """Map background — prefer /local/ (served from www/)."""
    found = _local_svg_url(ha_url, "hue-house-3d.svg")
    if found:
        return found
    svg = SVG_PATH.read_text()
    return "data:image/svg+xml;charset=utf-8," + quote(svg)


def load_home_map_image(ha_url: str = "http://homeassistant.local:8123") -> str:
    """Home dashboard map (no baked-in title)."""
    from generate_house_map import build_svg

    found = _local_svg_url(ha_url, "hue-house-home.svg")
    if found:
        return found
    home_path = Path(__file__).parent / "www" / "hue-house-home.svg"
    if home_path.exists():
        svg = home_path.read_text()
    else:
        svg = build_svg(show_header=False)
    return "data:image/svg+xml;charset=utf-8," + quote(svg)


def layout_light_positions(
    area: str, lights: list[str], primary: str | None
) -> dict[str, tuple[float, float]]:
    center = AREA_CENTERS.get(area, (50, 50))
    positions: dict[str, tuple[float, float]] = {}

    ordered = sorted(lights)
    if primary and primary in ordered:
        positions[primary] = ENTITY_OVERRIDES.get(primary, center)
        ordered = [e for e in ordered if e != primary]

    radius_x, radius_y = 5.5, 4.0
    for index, entity_id in enumerate(ordered):
        if entity_id in ENTITY_OVERRIDES:
            positions[entity_id] = ENTITY_OVERRIDES[entity_id]
            continue
        angle = (2 * math.pi * index) / max(len(ordered), 1)
        positions[entity_id] = (
            center[0] + radius_x * math.cos(angle),
            center[1] + radius_y * math.sin(angle),
        )
    return positions


def icon_element(entity_id: str, left: float, top: float, *, large: bool = False) -> dict:
    size = "34px" if large else "26px"
    return {
        "type": "state-icon",
        "entity": entity_id,
        "tap_action": {"action": "toggle"},
        "hold_action": {"action": "more-info"},
        "style": {
            "left": f"{left:.1f}%",
            "top": f"{top:.1f}%",
            "transform": "translate(-50%, -50%)",
            "--mdc-icon-size": size,
            "filter": "drop-shadow(0 0 8px rgba(255, 220, 120, 0.85))",
        },
    }


def build_map_view(
    areas: dict,
    friendly: dict[str, str],
    zone_primary: dict[str, str],
    ha_url: str = "http://homeassistant.local:8123",
    known_entities: set[str] | None = None,
) -> dict:
    """Full-width interactive 3D map panel."""
    elements: list[dict] = [
        {
            "type": "text",
            "text": "Tap a light on the map",
            "style": {
                "left": "2%",
                "top": "2%",
                "color": "#c8d6ef",
                "font-size": "13px",
                "background": "rgba(10,16,28,0.55)",
                "padding": "8px 12px",
                "border-radius": "10px",
            },
        },
    ]

    for area, data in areas.items():
        lights = [e["entity"] for e in data["lights"]]
        if known_entities is not None:
            lights = [e for e in lights if e in known_entities]
        if not lights:
            continue
        primary = zone_primary.get(area)
        if primary not in lights:
            primary = lights[0] if lights else None

        positions = layout_light_positions(area, lights, primary)
        for entity_id, (left, top) in positions.items():
            elements.append(
                icon_element(entity_id, left, top, large=(entity_id == primary))
            )

    map_card = {
        "type": "picture-elements",
        "image": load_map_image(ha_url),
        "aspect_ratio": "14:9",
        "darken_image": False,
        "elements": elements,
    }

    # Room quick-jump chips under the map
    zone_buttons = []
    for area in [
        "Living Room",
        "Kitchen",
        "Master Bedrrom",
        "Garden",
        "Outside",
        "Guest Room",
    ]:
        primary = zone_primary.get(area)
        if not primary:
            continue
        zone_buttons.append(
            {
                "type": "tile",
                "entity": primary,
                "name": area,
                "icon": "mdi:floor-plan",
                "vertical": False,
                "features": [{"type": "light-brightness"}],
            }
        )

    return {
        "title": "3D Map",
        "path": "map",
        "icon": "mdi:home-floor-3",
        "theme": "Graphite",
        "type": "panel",
        "cards": [
            {
                "type": "vertical-stack",
                "cards": [
                    {
                        "type": "markdown",
                        "content": (
                            "<div style='text-align:center;padding:8px 0 0;'>"
                            "<span style='font-size:11px;letter-spacing:0.28em;"
                            "text-transform:uppercase;opacity:0.55;'>Interactive</span><br>"
                            "<span style='font-size:26px;font-weight:300;'>3D Home Map</span>"
                            "</div>"
                        ),
                    },
                    map_card,
                    {
                        "type": "grid",
                        "columns": 3,
                        "square": False,
                        "cards": zone_buttons,
                    },
                ],
            }
        ],
    }
