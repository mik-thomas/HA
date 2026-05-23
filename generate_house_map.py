#!/usr/bin/env python3
"""Generate an isometric 3D-style house map SVG for Home Assistant picture-elements."""

from __future__ import annotations

import math
from pathlib import Path

OUT = Path(__file__).parent / "www" / "hue-house-3d.svg"

W, H = 1400, 900
ORIGIN_X, ORIGIN_Y = 700, 520

# Isometric helpers (2:1 dimetric, common for architectural diagrams)
ISO_X = 0.866  # cos(30)
ISO_Y = 0.5    # sin(30)


class _Bounds:
    def __init__(self) -> None:
        self.min_x = float("inf")
        self.min_y = float("inf")
        self.max_x = float("-inf")
        self.max_y = float("-inf")

    def add(self, x: float, y: float) -> None:
        self.min_x = min(self.min_x, x)
        self.min_y = min(self.min_y, y)
        self.max_x = max(self.max_x, x)
        self.max_y = max(self.max_y, y)

    def viewbox(self, pad: float = 36) -> str:
        x = self.min_x - pad
        y = self.min_y - pad
        w = self.max_x - self.min_x + 2 * pad
        h = self.max_y - self.min_y + 2 * pad
        return f"{x:.1f} {y:.1f} {w:.1f} {h:.1f}"


_BOUNDS = _Bounds()


def iso(cx: float, cy: float, gx: float, gy: float, gz: float = 0) -> tuple[float, float]:
    """Grid coords -> screen coords (origin top-left of footprint cluster)."""
    x = cx + (gx - gy) * ISO_X * 58
    y = cy + (gx + gy) * ISO_Y * 58 - gz * 42
    _BOUNDS.add(x, y)
    return x, y


def iso_footprint_rect(
    gx: float, gy: float, w: float, d: float, fz: float = 0, *, pad: float = 10
) -> tuple[float, float, float, float, float, float]:
    """Screen-space hit box for a room footprint (x, y, width, height, cx, cy)."""
    corners = [
        iso(ORIGIN_X, ORIGIN_Y, gx, gy, fz),
        iso(ORIGIN_X, ORIGIN_Y, gx + w, gy, fz),
        iso(ORIGIN_X, ORIGIN_Y, gx + w, gy + d, fz),
        iso(ORIGIN_X, ORIGIN_Y, gx, gy + d, fz),
    ]
    xs = [c[0] for c in corners]
    ys = [c[1] for c in corners]
    x0, x1 = min(xs) - pad, max(xs) + pad
    y0, y1 = min(ys) - pad, max(ys) + pad
    return x0, y0, x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2


# Footprints for ha-floorplan overlays (slug -> gx, gy, w, d, fz)
FLOORPLAN_ROOMS: dict[str, tuple[float, float, float, float, float]] = {
    "living_room": (0.3, 2.0, 4.2, 3.2, 0),
    "kitchen": (4.8, 1.2, 3.5, 3.8, 0),
    "kitchen_spots": (5.0, 0.2, 2.8, 1.0, 0),
    "cloak_room": (0.2, 5.4, 1.8, 1.5, 0),
    "guest_room": (2.3, 5.2, 2.4, 1.8, 0),
    "stairway": (4.9, 5.0, 1.6, 1.8, 0),
    "study_lamp": (6.8, 4.8, 2.2, 2.0, 0),
    "overtable": (2.2, 0.3, 2.0, 1.4, 0),
    "master_bedrrom": (0.5, 1.8, 4.0, 3.0, 0.55),
    "garden": (-0.2, -1.0, 10.4, 1.0, 0),
    "outside": (-0.6, 0.0, 0.6, 8.0, 0),
    "troff": (0.0, 8.0, 10.0, 0.8, 0),
}

# picture-elements map centers (display name -> grid center)
MAP_ROOM_CENTERS: dict[str, tuple[float, float, float]] = {
    "Living Room": (2.4, 3.6, 0),
    "Kitchen": (6.55, 3.1, 0),
    "Kitchen Spots": (6.4, 0.7, 0),
    "Master Bedrrom": (2.5, 3.3, 0.55),
    "Outside": (-0.3, 4.0, 0),
    "Garden": (5.0, -0.55, 0),
    "Guest Room": (3.5, 6.1, 0),
    "Stairway": (5.7, 5.9, 0),
    "Study Lamp": (7.9, 5.8, 0),
    "Cloak Room": (1.1, 6.15, 0),
    "Troff": (5.0, 8.4, 0),
    "Overtable": (3.2, 1.0, 0),
    "System & Unassigned": (9.5, 1.0, 0),
}


def iso_poly(points: list[tuple[float, ...]], fill: str, stroke: str = "#1a2744", opacity: float = 1) -> str:
    def _pt(p: tuple[float, ...]) -> str:
        z = p[2] if len(p) > 2 else 0.0
        sx, sy = iso(ORIGIN_X, ORIGIN_Y, p[0], p[1], z)
        return f"{sx:.1f},{sy:.1f}"

    pts = " ".join(_pt(p) for p in points)
    return (
        f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="1.4" '
        f'opacity="{opacity}" stroke-linejoin="round"/>'
    )


def iso_label(gx: float, gy: float, gz: float, text: str, size: int = 13) -> str:
    x, y = iso(ORIGIN_X, ORIGIN_Y, gx, gy, gz)
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" fill="#e8eef8" '
        f'font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="{size}" '
        f'font-weight="500" opacity="0.92">{text}</text>'
    )


SVG_DEFS = """
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0c1220"/>
        <stop offset="55%" stop-color="#121b2e"/>
        <stop offset="100%" stop-color="#0a0f18"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e2d45" stroke-width="0.6"/>
      </pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    """


def _background_layers(vb: str) -> list[str]:
    vx, vy, vw, vh = (float(x) for x in vb.split())
    return [
        f'<rect x="{vx:.1f}" y="{vy:.1f}" width="{vw:.1f}" height="{vh:.1f}" fill="url(#bg)"/>',
        f'<rect x="{vx:.1f}" y="{vy:.1f}" width="{vw:.1f}" height="{vh:.1f}" fill="url(#grid)" opacity="0.35"/>',
    ]


def _build_house_parts(*, show_map_labels: bool = True) -> list[str]:
    parts: list[str] = []
    parts.append(iso_poly([(0, 0, 0), (10, 0, 0), (10, 8, 0), (0, 8, 0)], "#243049", "#3d5278", 0.95))

    rooms = [
        ("Living Room", 0.3, 2.0, 4.2, 3.2, 0, 0.55, "#4a6fa5", "#2f4568"),
        ("Kitchen", 4.8, 1.2, 3.5, 3.8, 0, 0.55, "#5b8a72", "#355947"),
        ("Kitchen Spots", 5.0, 0.2, 2.8, 1.0, 0, 0.35, "#6aa388", "#3f6652"),
        ("Cloak Room", 0.2, 5.4, 1.8, 1.5, 0, 0.45, "#6d7f9d", "#425066"),
        ("Guest Room", 2.3, 5.2, 2.4, 1.8, 0, 0.45, "#7a6b9b", "#4a405f"),
        ("Stairway", 4.9, 5.0, 1.6, 1.8, 0, 0.55, "#8a7d6b", "#524a40"),
        ("Study", 6.8, 4.8, 2.2, 2.0, 0, 0.45, "#9b8468", "#5c4f3d"),
        ("Overtable", 2.2, 0.3, 2.0, 1.4, 0, 0.35, "#5f7fa0", "#3a4f66"),
    ]
    for name, gx, gy, w, d, fz, h, top, wall in rooms:
        parts.append(
            iso_poly(
                [(gx, gy, fz), (gx + w, gy, fz), (gx + w, gy + d, fz), (gx, gy + d, fz)],
                top,
                "#1a2744",
                0.88,
            )
        )
        parts.append(
            iso_poly(
                [(gx, gy + d, fz), (gx + w, gy + d, fz), (gx + w, gy + d, fz + h), (gx, gy + d, fz + h)],
                wall,
                "#101828",
                0.92,
            )
        )
        parts.append(
            iso_poly(
                [(gx + w, gy, fz), (gx + w, gy + d, fz), (gx + w, gy + d, fz + h), (gx + w, gy, fz + h)],
                _shade(wall, -15),
                "#101828",
                0.92,
            )
        )
        if show_map_labels:
            parts.append(iso_label(gx + w / 2, gy + d / 2, fz + h + 0.08, name, 12))

    upper = [
        ("Master Bedroom", 0.5, 1.8, 4.0, 3.0, 0.55, 0.5, "#b08c6a", "#6a5340"),
        ("Landing", 4.6, 4.8, 2.0, 1.6, 0.55, 0.35, "#7d8ea8", "#4a5568"),
    ]
    for name, gx, gy, w, d, fz, h, top, wall in upper:
        parts.append(
            iso_poly(
                [(gx, gy, fz), (gx + w, gy, fz), (gx + w, gy + d, fz), (gx, gy + d, fz)],
                top,
                "#1a2744",
                0.9,
            )
        )
        parts.append(
            iso_poly(
                [(gx, gy + d, fz), (gx + w, gy + d, fz), (gx + w, gy + d, fz + h), (gx, gy + d, fz + h)],
                wall,
                "#101828",
                0.92,
            )
        )
        parts.append(
            iso_poly(
                [(gx + w, gy, fz), (gx + w, gy + d, fz), (gx + w, gy + d, fz + h), (gx + w, gy, fz + h)],
                _shade(wall, -12),
                "#101828",
                0.92,
            )
        )
        if show_map_labels:
            parts.append(iso_label(gx + w / 2, gy + d / 2, fz + h + 0.1, name, 12))

    parts.append(iso_poly([(0, -1.2, 0), (10, -1.2, 0), (10, 0, 0), (0, 0, 0)], "#2d5a3d", "#1f3d2a", 0.75))
    if show_map_labels:
        parts.append(iso_label(5, -0.5, 0.05, "Garden", 13))
    parts.append(iso_poly([(-0.8, 0), (-0.8, 8), (0, 8), (0, 0)], "#3a4f66", "#243041", 0.6))
    if show_map_labels:
        parts.append(iso_label(-0.35, 4, 0.05, "Outside", 11))
    parts.append(iso_poly([(10, 0), (10.8, 0), (10.8, 8), (10, 8)], "#3a4f66", "#243041", 0.6))
    if show_map_labels:
        parts.append(iso_label(10.35, 4, 0.05, "Porch", 11))
    parts.append(iso_poly([(0, 8), (10, 8), (10, 8.8), (0, 8.8)], "#3d5568", "#243041", 0.55))
    if show_map_labels:
        parts.append(iso_label(5, 8.35, 0.05, "Troff / Rear", 11))

    if show_map_labels:
        for name, (gx, gy, gz) in MAP_ROOM_CENTERS.items():
            if name == "System & Unassigned":
                continue
            x, y = iso(ORIGIN_X, ORIGIN_Y, gx, gy, gz)
            parts.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" '
                f'fill="#ffd166" opacity="0.35" stroke="#fff8e7" stroke-width="1"/>'
            )
    return parts


def build_floorplan_overlays() -> str:
    """ha-floorplan hit targets aligned to isometric room footprints."""
    overlays: list[str] = []
    labels = {
        "living_room": "Living Room",
        "kitchen": "Kitchen",
        "kitchen_spots": "Kitchen Spots",
        "master_bedrrom": "Master Bedrrom",
        "guest_room": "Guest Room",
        "cloak_room": "Cloak Room",
        "stairway": "Stairway",
        "study_lamp": "Study Lamp",
        "garden": "Garden",
        "outside": "Outside",
        "troff": "Troff",
        "overtable": "Overtable",
    }
    for slug, (gx, gy, w, d, fz) in FLOORPLAN_ROOMS.items():
        x, y, rw, rh, cx, cy = iso_footprint_rect(gx, gy, w, d, fz)
        label = labels.get(slug, slug.replace("_", " ").title())
        overlays.append(
            f'<g id="area.{slug}.bg" class="bg-off">'
            f'<rect x="{x:.0f}" y="{y:.0f}" width="{rw:.0f}" height="{rh:.0f}" '
            f'rx="8" fill="var(--primary-color)" opacity="0.15"/></g>'
            f'<text id="area.{slug}.label" class="room-label" x="{cx:.0f}" y="{cy:.0f}" '
            f'text-anchor="middle">{label}</text>'
        )
    return "\n".join(overlays)


def map_center_percents() -> dict[str, tuple[float, float]]:
    """Screen % positions for picture-elements (relative to viewBox)."""
    pad = 36.0
    vb_x = _BOUNDS.min_x - pad
    vb_y = _BOUNDS.min_y - pad
    vb_w = _BOUNDS.max_x - _BOUNDS.min_x + 2 * pad
    vb_h = _BOUNDS.max_y - _BOUNDS.min_y + 2 * pad
    out: dict[str, tuple[float, float]] = {}
    for name, (gx, gy, gz) in MAP_ROOM_CENTERS.items():
        x, y = iso(ORIGIN_X, ORIGIN_Y, gx, gy, gz)
        out[name] = ((x - vb_x) / vb_w * 100, (y - vb_y) / vb_h * 100)
    return out


def build_svg(*, show_header: bool = True) -> str:
    global _BOUNDS
    _BOUNDS = _Bounds()
    parts = _build_house_parts()
    vb = _BOUNDS.viewbox()
    pad = 36.0
    tx, ty = _BOUNDS.min_x - pad, _BOUNDS.min_y - pad
    if show_header:
        parts.append(
            f'<text x="{tx + 48:.1f}" y="{ty + 58:.1f}" fill="#f0f4ff" '
            f'font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" font-weight="300">'
            f"Home Lighting Map</text>"
            f'<text x="{tx + 50:.1f}" y="{ty + 88:.1f}" fill="#9fb0cc" '
            f'font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" letter-spacing="0.2em">'
            f"ISOMETRIC 3D VIEW · PHILIPS HUE</text>"
        )
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{W}" height="{H}">\n'
        f"{SVG_DEFS}\n"
        + "\n".join(_background_layers(vb) + parts)
        + "\n</svg>"
    )


def build_floorplan_svg() -> str:
    """Isometric map + ha-floorplan overlays in one SVG."""
    global _BOUNDS
    _BOUNDS = _Bounds()
    parts = _build_house_parts(show_map_labels=False)
    parts.append(build_floorplan_overlays())
    vb = _BOUNDS.viewbox()
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{W}" height="{H}">\n'
        f"{SVG_DEFS}\n"
        + "\n".join(_background_layers(vb) + parts)
        + "\n</svg>"
    )


def _shade(hex_color: str, delta: int) -> str:
    hex_color = hex_color.lstrip("#")
    r = max(0, min(255, int(hex_color[0:2], 16) + delta))
    g = max(0, min(255, int(hex_color[2:4], 16) + delta))
    b = max(0, min(255, int(hex_color[4:6], 16) + delta))
    return f"#{r:02x}{g:02x}{b:02x}"


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build_svg(show_header=True))
    (Path(__file__).parent / "www" / "hue-house-home.svg").write_text(
        build_svg(show_header=False)
    )
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
