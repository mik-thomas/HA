#!/usr/bin/env python3
"""Register Madelena-style Lovelace resources (requires HACS cards installed)."""

import asyncio
import json
from pathlib import Path

import websockets

RESOURCES = Path(__file__).parent / "lovelace_resources_madelena.json"
TOKEN_PATH = Path("/tmp/ha_token.txt")


async def main() -> None:
    items = json.loads(RESOURCES.read_text())
    token = TOKEN_PATH.read_text().strip()
    uri = "ws://homeassistant.local:8123/api/websocket"

    async with websockets.connect(uri) as ws:
        await ws.recv()
        await ws.send(json.dumps({"type": "auth", "access_token": token}))
        assert json.loads(await ws.recv())["type"] == "auth_ok"

        await ws.send(json.dumps({"id": 1, "type": "lovelace/resources"}))
        existing_urls = set()
        while True:
            r = json.loads(await ws.recv())
            if r.get("id") == 1:
                for item in r.get("result", []):
                    existing_urls.add(item.get("url"))
                break

        msg_id = 2
        for item in items:
            if item["url"] in existing_urls:
                print("skip", item["url"])
                continue
            await ws.send(
                json.dumps(
                    {
                        "id": msg_id,
                        "type": "lovelace/resources/create",
                        "url": item["url"],
                        "res_type": item["type"],
                    }
                )
            )
            while True:
                r = json.loads(await ws.recv())
                if r.get("id") == msg_id:
                    print(item["url"], "OK" if r.get("success") else r)
                    msg_id += 1
                    break


if __name__ == "__main__":
    asyncio.run(main())
