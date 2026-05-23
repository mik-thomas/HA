#!/usr/bin/env python3
"""Print CDP step expressions for manual/browser upload (one per line marker)."""
from pathlib import Path

ROOT = Path(__file__).parent
ORDER = [
    ("ha-floorplan.css", None),
    ("hue-house-3d_svg", "hue-house-3d.svg"),
    ("home-floorplan_svg", "home-floorplan.svg"),
]

def main() -> None:
    # CSS single save
    css = (ROOT / "www" / "ha-floorplan.css").read_text(encoding="utf-8")
    import json

    payload = json.dumps({"filename": "www/ha-floorplan.css", "text": css})
    print("===FILE:ha-floorplan.css===")
    print(
        f"(async () => {{ const data = {payload}; const body = new URLSearchParams({{ filename: data.filename, text: data.text }}); const r = await fetch('api/save', {{ method: 'POST', credentials: 'include', headers: {{ 'Content-Type': 'application/x-www-form-urlencoded' }}, body }}); return {{ file: data.filename, status: r.status, body: await r.text() }}; }})()"
    )

    for folder, _ in ORDER[1:]:
        steps_dir = ROOT / ".cdp_b64_steps" / folder
        print(f"===FOLDER:{folder}===")
        for step in sorted(steps_dir.glob("step_*.js")):
            print(f"---{step.name}---")
            print(step.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
