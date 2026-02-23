from __future__ import annotations

import json
from typing import Any

import httpx

from ai_music.llm.base import extract_json_object


class OpenRouterClient:
    provider_name = "openrouter"

    def __init__(self, api_key: str, base_url: str = "https://openrouter.ai/api/v1", timeout: float = 60.0):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://local.ai-music",
            "X-Title": "ai-music",
        }

    def list_models(self) -> dict[str, Any]:
        with httpx.Client(timeout=self.timeout) as client:
            r = client.get(f"{self.base_url}/models", headers=self._headers())
            r.raise_for_status()
            return r.json()

    def generate(self, system: str, user: str, model: str | None = None, **kwargs: Any) -> str:
        payload = {
            "model": model or "openai/gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": kwargs.get("temperature", 0.2),
        }
        with httpx.Client(timeout=self.timeout) as client:
            r = client.post(f"{self.base_url}/chat/completions", headers=self._headers(), json=payload)
            r.raise_for_status()
            data = r.json()
        return data["choices"][0]["message"]["content"]

    def generate_structured(
        self,
        task_name: str,
        inputs: dict[str, Any],
        schema: dict[str, Any],
        model: str | None = None,
        max_attempts: int = 2,
    ) -> dict[str, Any]:
        system = (
            "Return valid JSON only. Do not use markdown fences. "
            "Match the requested schema shape as closely as possible."
        )
        user = (
            f"Task: {task_name}\n\n"
            f"Schema (JSON Schema excerpt):\n{json.dumps(schema, indent=2)}\n\n"
            f"Inputs:\n{json.dumps(inputs, indent=2, ensure_ascii=False)}"
        )
        last_error: Exception | None = None
        response_text = ""
        for attempt in range(1, max_attempts + 1):
            try:
                response_text = self.generate(system, user, model=model)
                return extract_json_object(response_text)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt == max_attempts:
                    break
                user = (
                    "The previous answer was invalid JSON or failed parsing.\n\n"
                    f"Error: {exc}\n\n"
                    f"Previous answer:\n{response_text}\n\n"
                    "Return corrected valid JSON only."
                )
        raise RuntimeError(f"OpenRouter structured generation failed: {last_error}") from last_error
