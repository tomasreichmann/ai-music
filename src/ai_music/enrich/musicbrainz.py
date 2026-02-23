from __future__ import annotations

import time
from typing import Any

import httpx

from ai_music.enrich.cache import cache_get, cache_set


class MusicBrainzClient:
    def __init__(self, user_agent: str, cache_dir, timeout: float = 30.0, min_interval: float = 1.1):
        self.user_agent = user_agent
        self.cache_dir = cache_dir
        self.timeout = timeout
        self.min_interval = min_interval
        self._last_call = 0.0

    def _throttle(self) -> None:
        wait = self.min_interval - (time.time() - self._last_call)
        if wait > 0:
            time.sleep(wait)
        self._last_call = time.time()

    def search_recording(self, query: str) -> dict[str, Any]:
        cache_key = f"search_recording:{query}"
        cached = cache_get(self.cache_dir, "musicbrainz", cache_key)
        if cached is not None:
            return {"cache_hit": True, "data": cached}
        self._throttle()
        headers = {"User-Agent": self.user_agent}
        params = {"query": query, "fmt": "json", "limit": 5}
        with httpx.Client(timeout=self.timeout, headers=headers) as client:
            r = client.get("https://musicbrainz.org/ws/2/recording", params=params)
            r.raise_for_status()
            data = r.json()
        cache_set(self.cache_dir, "musicbrainz", cache_key, data)
        return {"cache_hit": False, "data": data}
