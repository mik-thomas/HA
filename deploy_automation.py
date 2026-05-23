#!/usr/bin/env python3
"""Deploy a Home Assistant automation JSON config via REST API."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

HA_URL = "http://homeassistant.local:8123"
TOKEN_PATH = Path("/tmp/ha_token.txt")
AUTOMATIONS_DIR = Path(__file__).parent / "automations"


def deploy(automation_id: str, config: dict) -> None:
    token = TOKEN_PATH.read_text().strip()
    body = json.dumps(config).encode()
    req = urllib.request.Request(
        f"{HA_URL}/api/config/automation/config/{automation_id}",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(resp.read().decode() or "OK", f"({resp.status})")
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("automation_id", help="Config id (filename without extension)")
    args = parser.parse_args()
    path = AUTOMATIONS_DIR / f"{args.automation_id}.json"
    if not path.exists():
        path = AUTOMATIONS_DIR / f"{args.automation_id}.yaml"
    if path.suffix == ".yaml":
        import yaml  # type: ignore

        config = yaml.safe_load(path.read_text())
    else:
        config = json.loads(path.read_text())
    deploy(args.automation_id, config)


if __name__ == "__main__":
    main()
