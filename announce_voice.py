#!/usr/bin/env python3
"""Speak on Home Assistant Voice — works even when HA network URL is unset."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HA_URL = "http://homeassistant.local:8123"
MEDIA_PLAYER = "media_player.home_assistant_voice_0aadf3_media_player"
SATELLITE = "assist_satellite.home_assistant_voice_0aadf3_assist_satellite"
TTS_ENTITY = "tts.google_translate_en_com"
TOKEN_PATH = Path("/tmp/ha_token.txt")


def _token() -> str:
    return TOKEN_PATH.read_text().strip()


def _post(service: str, payload: dict, *, timeout: float = 30) -> tuple[int, str]:
    req = urllib.request.Request(
        f"{HA_URL}/api/services/{service}",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {_token()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode()


def _internal_url_set() -> bool:
    req = urllib.request.Request(
        f"{HA_URL}/api/config",
        headers={"Authorization": f"Bearer {_token()}"},
    )
    try:
        cfg = json.loads(urllib.request.urlopen(req, timeout=10).read())
        return bool(cfg.get("internal_url"))
    except Exception:
        return False


def unstick_voice() -> None:
    for service, payload in [
        ("media_player/media_stop", {"entity_id": MEDIA_PLAYER}),
        ("light/turn_off", {"entity_id": "light.home_assistant_voice_0aadf3_led_ring"}),
    ]:
        try:
            _post(service, payload, timeout=10)
        except Exception:
            pass


def speak_direct(message: str) -> None:
    """Play TTS from the internet (Voice PE can reach this; HA-hosted TTS may not)."""
    url = (
        "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q="
        + urllib.parse.quote(message)
    )
    _post(
        "media_player/play_media",
        {
            "entity_id": MEDIA_PLAYER,
            "media_content_id": url,
            "media_content_type": "music",
        },
        timeout=30,
    )


def speak_ha_tts(message: str) -> None:
    _post(
        "tts/speak",
        {
            "entity_id": TTS_ENTITY,
            "message": message,
            "media_player_entity_id": MEDIA_PLAYER,
            "cache": True,
        },
        timeout=45,
    )


def announce(message: str, *, preannounce: bool = False) -> None:
    unstick_voice()
    if _internal_url_set():
        try:
            speak_ha_tts(message)
            print("OK — HA tts.speak")
            return
        except Exception as exc:
            print(f"HA TTS failed ({exc}), using direct playback…", file=sys.stderr)

    speak_direct(message)
    print("OK — direct media playback")


def main() -> None:
    parser = argparse.ArgumentParser(description="Speak on Home Assistant Voice")
    parser.add_argument("message", nargs="?", default="Voice assistant online.")
    parser.add_argument("--unstick", action="store_true", help="Stop stuck playback / white LED")
    args = parser.parse_args()
    if args.unstick:
        unstick_voice()
        print("Unstick commands sent")
        return
    try:
        announce(args.message)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Cannot reach Home Assistant: {e.reason}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
