#!/usr/bin/env python3
"""Upload www files to HA File editor via api/upload (run steps in browser CDP context 71+).

Usage: open File editor in Cursor browser, then run with browser MCP or paste steps.
This script prints step count; actual upload uses browser_cdp from agent.
"""
from __future__ import annotations

import base64
import json
from pathlib import Path

ROOT = Path(__file__).parent
WWW = ROOT / "www"


def upload_expr(name: str, mime: str) -> str:
    b64 = base64.b64encode((WWW / name).read_bytes()).decode()
    return f"""(async () => {{
  const f = {{ name: {json.dumps(name)}, type: {json.dumps(mime)}, b64: {json.dumps(b64)} }};
  const bin = atob(f.b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  const fd = new FormData();
  fd.append('file', new Blob([text], {{ type: f.type }}), f.name);
  fd.append('path', 'www');
  const r = await fetch('api/upload', {{ method: 'POST', credentials: 'include', body: fd }});
  return {{ name: f.name, status: r.status, body: await r.text() }};
}})()"""


def main() -> None:
    for name, mime in [
        ("ha-floorplan.css", "text/css"),
        ("hue-house-3d.svg", "image/svg+xml"),
        ("home-floorplan.svg", "image/svg+xml"),
    ]:
        expr = upload_expr(name, mime)
        out = ROOT / ".cdp_upload_one" / name.replace(".", "_")
        out.write_text(expr, encoding="utf-8")
        print(f"{name}: {len(expr)} bytes -> {out.name}")


if __name__ == "__main__":
    main()
