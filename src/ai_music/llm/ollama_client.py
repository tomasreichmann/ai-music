from __future__ import annotations

import json
from typing import Any

import httpx

from ai_music.llm.base import extract_json_object


class OllamaClient:
    provider_name = "ollama"

    def __init__(self, base_url: str = "http://localhost:11434", timeout: float = 120.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def generate(self, system: str, user: str, model: str | None = None, **kwargs: Any) -> str:
        payload = {
            "model": model or "llama3.1:8b",
            "prompt": f"{system}\n\n{user}",
            "stream": False,
            "options": {"temperature": kwargs.get("temperature", 0.2)},
        }
        with httpx.Client(timeout=self.timeout) as client:
            r = client.post(f"{self.base_url}/api/generate", json=payload)
            r.raise_for_status()
            data = r.json()
        return data.get("response", "")

    def generate_structured(
        self,
        task_name: str,
        inputs: dict[str, Any],
        schema: dict[str, Any],
        model: str | None = None,
        max_attempts: int = 2,
    ) -> dict[str, Any]:
        system = "Return only valid JSON. No markdown."
        user = (
            f"Task: {task_name}\nSchema: {json.dumps(schema, ensure_ascii=False)}\n"
            f"Inputs: {json.dumps(inputs, ensure_ascii=False)}"
        )
        last_exc: Exception | None = None
        text = ""
        for _ in range(max_attempts):
            try:
                text = self.generate(system, user, model=model)
                return extract_json_object(text)
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                user = f"Fix this into valid JSON only: {text}"
        raise RuntimeError(f"Ollama structured generation failed: {last_exc}") from last_exc
