from __future__ import annotations

import json
import re
from typing import Any, Protocol


JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*\})\s*```", re.DOTALL)


class LLMClient(Protocol):
    provider_name: str

    def generate(self, system: str, user: str, model: str | None = None, **kwargs: Any) -> str: ...

    def generate_structured(
        self,
        task_name: str,
        inputs: dict[str, Any],
        schema: dict[str, Any],
        model: str | None = None,
        max_attempts: int = 2,
    ) -> dict[str, Any]: ...


def extract_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    match = JSON_BLOCK_RE.search(text)
    if match:
        return json.loads(match.group(1))
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])
    return json.loads(text)
