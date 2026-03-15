from __future__ import annotations

from typing import Any

from ai_music.suno.schemas import SunoAdaptedPrompt


def _coerce_optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _dedupe_preserve(items: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for item in items:
        token = str(item).strip()
        if not token:
            continue
        key = token.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(token)
    return out


def adapt_baseline_prompt(
    baseline: dict[str, Any],
    theme: str,
    llm_client: Any,
    model: str | None = None,
    preserve_controls: bool = True,
    max_attempts: int = 2,
) -> SunoAdaptedPrompt:
    schema = {
        "type": "object",
        "properties": {
            "song_title": {"type": "string"},
            "style_prompt": {"type": "string"},
            "exclude_styles": {"type": "array", "items": {"type": "string"}},
            "lyrics": {"type": "string"},
            "weirdness": {"type": "integer", "minimum": 0, "maximum": 100},
            "style_influence": {"type": "integer", "minimum": 0, "maximum": 100},
            "rationale": {"type": "string"},
        },
        "required": [
            "song_title",
            "style_prompt",
            "exclude_styles",
            "lyrics",
            "weirdness",
            "style_influence",
            "rationale",
        ],
        "additionalProperties": False,
    }

    raw = llm_client.generate_structured(
        task_name="suno_adapt_baseline_prompt",
        inputs={
            "theme": theme,
            "baseline": baseline,
            "requirements": {
                "goal": "Adapt the baseline prompt to the requested theme while preserving the same core production identity.",
                "must_preserve": [
                    "genre direction implied by baseline style prompt",
                    "exclude styles unless the user explicitly asks to change them",
                    "overall control profile of weirdness/style_influence",
                ],
                "output_fields": [
                    "song_title",
                    "style_prompt",
                    "exclude_styles",
                    "lyrics",
                    "weirdness",
                    "style_influence",
                    "rationale",
                ],
            },
        },
        schema=schema,
        model=model,
        max_attempts=max_attempts,
    )
    adapted = SunoAdaptedPrompt.model_validate(raw)

    if preserve_controls:
        baseline_weirdness = _coerce_optional_int(baseline.get("weirdness"))
        baseline_style_influence = _coerce_optional_int(baseline.get("style_influence"))
        baseline_excludes = _dedupe_preserve([str(x) for x in baseline.get("exclude_styles", [])])
        if baseline_weirdness is not None:
            adapted.weirdness = baseline_weirdness
        if baseline_style_influence is not None:
            adapted.style_influence = baseline_style_influence
        if baseline_excludes:
            adapted.exclude_styles = baseline_excludes
    adapted.exclude_styles = _dedupe_preserve(adapted.exclude_styles)
    return adapted
