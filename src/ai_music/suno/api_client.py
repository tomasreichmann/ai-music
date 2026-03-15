from __future__ import annotations

from typing import Any

import httpx

from ai_music.suno.schemas import SunoMappingConfig


class SunoApiClient:
    def __init__(self, api_key: str, timeout: float = 30.0):
        self.api_key = api_key
        self.timeout = timeout

    def _headers(self, mapping: SunoMappingConfig) -> dict[str, str]:
        headers: dict[str, str] = {}
        context = {"SUNO_API_KEY": self.api_key}
        for key, value in mapping.api.headers.items():
            headers[key] = value.format(**context)
        return headers

    def fetch_created_page(
        self,
        mapping: SunoMappingConfig,
        cursor: str | None = None,
        page_size: int | None = None,
    ) -> dict[str, Any]:
        method = mapping.api.http_method.upper().strip()
        if method != "GET":
            raise ValueError(f"Unsupported http_method '{method}'. Only GET is supported.")

        url = f"{mapping.api.base_url.rstrip('/')}/{mapping.api.created_songs_endpoint.lstrip('/')}"
        params: dict[str, Any] = {mapping.api.page_size_param: page_size or mapping.api.page_size_default}
        if cursor:
            params[mapping.api.cursor_param] = cursor

        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(url, params=params, headers=self._headers(mapping))
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Suno API page response must be a JSON object.")
        return payload
