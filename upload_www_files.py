#!/usr/bin/env python3
"""Upload www assets to Home Assistant via File editor api/save (browser session)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent
WWW = ROOT / "www"
FILES = [
    "ha-floorplan.css",
    "home-floorplan.svg",
    "hue-house-3d.svg",
    "hue-house-home.svg",
]


def build_save_js(filename: str, text: str) -> str:
    payload = json.dumps({"filename": f"www/{filename}", "text": text})
    return f"""
(async () => {{
  const data = {payload};
  const body = new URLSearchParams({{ filename: data.filename, text: data.text }});
  const r = await fetch('api/save', {{
    method: 'POST',
    credentials: 'include',
    headers: {{ 'Content-Type': 'application/x-www-form-urlencoded' }},
    body,
  }});
  return {{ status: r.status, body: await r.text() }};
}})()
"""


def main() -> None:
    for name in FILES:
        path = WWW / name
        text = path.read_text(encoding="utf-8")
        js = build_save_js(name, text)
        out_path = ROOT / f".upload_{name}.js"
        out_path.write_text(js, encoding="utf-8")
        print(f"Prepared {name} ({len(text)} bytes) -> {out_path.name}")


if __name__ == "__main__":
    main()
