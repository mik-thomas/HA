"""Madelena-style home view: dark sidebar + full-height 3D map with overlays."""

from __future__ import annotations

from typing import Any

from floorplan_map import load_home_map_image

THEME = "midnight"
HA_URL = "http://homeassistant.local:8123"

_DARK = [
    {"background-color": "rgba(18, 22, 34, 0.96)"},
    {"color": "#e8ecf4"},
    {"border-radius": "18px"},
    {"border": "1px solid rgba(255, 255, 255, 0.08)"},
    {"box-shadow": "0 8px 32px rgba(0, 0, 0, 0.35)"},
]


_ROOT_MOD = {
    "style": (
        "hui-view $ #view {\n"
        "  padding: 0 !important;\n"
        "  max-width: none !important;\n"
        "  background: linear-gradient(145deg, #0a0e18 0%, #121828 50%, #0c101a 100%) !important;\n"
        "}\n"
        "layout-card {\n"
        "  height: calc(100vh - 56px) !important;\n"
        "}\n"
        "ha-card {\n"
        "  background: transparent !important;\n"
        "  box-shadow: none !important;\n"
        "  border: none !important;\n"
        "}\n"
    )
}

_MAP_MOD = {
    "style": (
        "ha-card {\n"
        "  background: #d8dce6 !important;\n"
        "  border-radius: 20px !important;\n"
        "  height: 100% !important;\n"
        "  min-height: calc(100vh - 72px) !important;\n"
        "}\n"
        "hui-image $ #root, hui-image $ #container {\n"
        "  height: 100% !important;\n"
        "  padding-bottom: 0 !important;\n"
        "}\n"
        "hui-image $ img {\n"
        "  position: absolute !important;\n"
        "  inset: 0 !important;\n"
        "  width: 100% !important;\n"
        "  height: 100% !important;\n"
        "  object-fit: contain !important;\n"
        "}\n"
    )
}


def _clock_card() -> dict[str, Any]:
    return {
        "type": "custom:button-card",
        "show_icon": False,
        "show_name": True,
        "show_label": True,
        "name": (
            "[[[ return new Date().toLocaleTimeString('en-GB',"
            "{hour:'2-digit',minute:'2-digit'}); ]]]"
        ),
        "label": (
            "[[[ const h=new Date().getHours();"
            "const g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';"
            "return g+' · '+new Date().toLocaleDateString('en-GB',"
            "{weekday:'short',day:'numeric',month:'short'}); ]]]"
        ),
        "triggers_update": ["second"],
        "styles": {
            "card": _DARK,
            "name": [
                {"font-size": "3rem", "font-weight": "300", "justify-self": "start"},
                {"text-align": "left", "padding": "16px 16px 0"},
            ],
            "label": [
                {"font-size": "0.95rem", "opacity": "0.85", "justify-self": "start"},
                {"text-align": "left", "padding": "0 16px 16px"},
            ],
            "grid": [
                {"grid-template-areas": '"n" "l"', "grid-template-columns": "1fr"},
            ],
        },
        "view_layout": {"grid-column": "1", "grid-row": "1"},
    }


def _climate_card(temp_entity: str, label: str) -> dict[str, Any]:
    return {
        "type": "custom:button-card",
        "entity": temp_entity,
        "show_icon": True,
        "icon": "mdi:thermostat",
        "show_name": True,
        "show_state": True,
        "name": label,
        "styles": {
            "card": _DARK,
            "icon": [{"color": "#6eb6ff", "width": "40px"}],
            "name": [{"font-size": "0.85rem", "opacity": "0.75"}],
            "state": [{"font-size": "2rem", "font-weight": "400"}],
            "grid": [
                {
                    "grid-template-areas": '"i s" "i n"',
                    "grid-template-columns": "min-content 1fr",
                },
            ],
        },
        "tap_action": {"action": "more-info"},
        "view_layout": {"grid-column": "1", "grid-row": "2"},
    }


def _weather_card() -> dict[str, Any]:
    return {
        "type": "custom:button-card",
        "entity": "weather.forecast_home",
        "show_icon": True,
        "show_name": True,
        "show_label": True,
        "show_state": False,
        "name": "[[[ return entity.state; ]]]",
        "label": (
            "[[[ return entity.attributes.temperature + ' ' + "
            "(entity.attributes.temperature_unit || ''); ]]]"
        ),
        "styles": {
            "card": [*_DARK, {"height": "100%", "min-height": "220px"}],
            "icon": [{"width": "56px"}],
            "name": [{"text-transform": "capitalize", "font-size": "1.1rem"}],
            "label": [{"font-size": "2.2rem", "font-weight": "400"}],
            "grid": [
                {
                    "grid-template-areas": '"i l" "i n"',
                    "grid-template-columns": "min-content 1fr",
                },
            ],
        },
        "tap_action": {"action": "more-info"},
        "view_layout": {
            "grid-column": "1",
            "grid-row": "3",
            "place-self": "stretch",
        },
    }


def _sidebar_layout(states: dict[str, dict]) -> dict[str, Any]:
    cards: list[dict[str, Any]] = [_clock_card()]
    if "sensor.kitchen_aqara_pir_sensor_temperature" in states:
        cards.append(
            _climate_card(
                "sensor.kitchen_aqara_pir_sensor_temperature",
                "Kitchen · indoor",
            )
        )
    if "weather.forecast_home" in states:
        cards.append(_weather_card())

    return {
        "type": "custom:layout-card",
        "layout_type": "custom:grid-layout",
        "layout": {
            "grid-template-columns": "1fr",
            "grid-template-rows": "auto auto minmax(0, 1fr)",
            "height": "100%",
            "gap": "10px",
        },
        "view_layout": {
            "grid-column": "1",
            "grid-row": "1 / -1",
            "place-self": "stretch",
        },
        "cards": cards,
    }


def _person_elements(states: dict[str, dict]) -> list[dict[str, Any]]:
    people = sorted(e for e in states if e.startswith("person."))[:2]
    elements: list[dict[str, Any]] = []
    for index, entity in enumerate(people):
        elements.append(
            {
                "type": "state-badge",
                "entity": entity,
                "style": {
                    "left": "1.5%",
                    "top": f"{4 + index * 14}%",
                    "transform": "scale(1.15)",
                    "z-index": "6",
                },
            }
        )
    return elements


def _extract_picture_map(map_view: dict[str, Any]) -> dict[str, Any]:
    inner = map_view.get("cards", [{}])[0]
    stack = inner.get("cards", [])
    pe = next((c for c in stack if c.get("type") == "picture-elements"), None)
    if not pe:
        return {"type": "markdown", "content": "Map unavailable"}
    elements = [
        el
        for el in pe.get("elements", [])
        if not (el.get("type") == "text" and "Tap a light" in el.get("text", ""))
    ]
    return {
        "type": "picture-elements",
        "image": load_home_map_image(HA_URL),
        "darken_image": False,
        "elements": elements,  # person badges added in build_madelena_home_view
    }


def build_madelena_home_view(
    states: dict[str, dict],
    floorplan_config: dict[str, Any],
    map_view: dict[str, Any],
    *,
    use_floorplan: bool,
) -> dict[str, Any]:
    """Panel view: dark left rail + full-height interactive 3D map."""
    del floorplan_config, use_floorplan

    pe = _extract_picture_map(map_view)
    pe["elements"] = _person_elements(states) + pe.get("elements", [])
    pe["card_mod"] = _MAP_MOD
    pe["view_layout"] = {
        "grid-column": "2",
        "grid-row": "1 / -1",
        "place-self": "stretch",
        "min-height": "0",
    }

    cards: list[dict[str, Any]] = [_sidebar_layout(states), pe]

    return {
        "title": "Home",
        "path": "home",
        "icon": "mdi:home-account",
        "theme": THEME,
        "type": "panel",
        "cards": [
            {
                "type": "custom:layout-card",
                "layout_type": "custom:grid-layout",
                "layout": {
                    "grid-template-columns": "minmax(300px, 26vw) minmax(0, 1fr)",
                    "grid-template-rows": "minmax(0, 1fr)",
                    "height": "calc(100vh - 56px)",
                    "gap": "12px",
                    "padding": "10px 12px 12px",
                    "place-items": "stretch",
                },
                "card_mod": _ROOT_MOD,
                "cards": cards,
            }
        ],
    }
