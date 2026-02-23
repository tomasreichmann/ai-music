from __future__ import annotations

from typing import Any

import httpx

from ai_music.enrich.cache import cache_get, cache_set


class LastFMClient:
    def __init__(self, api_key: str, cache_dir, timeout: float = 20.0):
        self.api_key = api_key
        self.cache_dir = cache_dir
        self.timeout = timeout

    def track_info(self, artist: str, track: str) -> dict[str, Any]:
        cache_key = f"track_info:{artist}:{track}"
        cached = cache_get(self.cache_dir, "lastfm", cache_key)
        if cached is not None:
            return {"cache_hit": True, "data": cached}
        params = {
            "method": "track.getInfo",
            "api_key": self.api_key,
            "artist": artist,
            "track": track,
            "format": "json",
            "autocorrect": 1,
        }
        with httpx.Client(timeout=self.timeout) as client:
            r = client.get("https://ws.audioscrobbler.com/2.0/", params=params)
            r.raise_for_status()
            data = r.json()
        cache_set(self.cache_dir, "lastfm", cache_key, data)
        return {"cache_hit": False, "data": data}
