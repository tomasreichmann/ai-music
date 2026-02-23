from __future__ import annotations

from typing import Any

import httpx

from ai_music.enrich.cache import cache_get, cache_set


class AcoustIDClient:
    def __init__(self, api_key: str, cache_dir, timeout: float = 30.0):
        self.api_key = api_key
        self.cache_dir = cache_dir
        self.timeout = timeout

    def lookup(self, fingerprint: str, duration_seconds: int) -> dict[str, Any]:
        cache_key = f"lookup:{duration_seconds}:{fingerprint}"
        cached = cache_get(self.cache_dir, "acoustid", cache_key)
        if cached is not None:
            return {"cache_hit": True, "data": cached}
        params = {
            "client": self.api_key,
            "meta": "recordings releasegroups releases tracks compress usermeta sources",
            "fingerprint": fingerprint,
            "duration": duration_seconds,
            "format": "json",
        }
        with httpx.Client(timeout=self.timeout) as client:
            r = client.get("https://api.acoustid.org/v2/lookup", params=params)
            r.raise_for_status()
            data = r.json()
        cache_set(self.cache_dir, "acoustid", cache_key, data)
        return {"cache_hit": False, "data": data}
