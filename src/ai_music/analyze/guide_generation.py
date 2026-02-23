from __future__ import annotations

import json
from typing import Any

from ai_music.config import AppConfig
from ai_music.llm.ollama_client import OllamaClient
from ai_music.llm.openrouter_client import OpenRouterClient


def _select_llm(cfg: AppConfig) -> tuple[Any | None, str]:
    if cfg.providers.openrouter_api_key:
        return OpenRouterClient(cfg.providers.openrouter_api_key), "openrouter"
    return OllamaClient(cfg.providers.ollama_base_url), "ollama"


def build_playlist_guide_markdown(
    cfg: AppConfig,
    playlist_profile: dict[str, Any],
    sample_tracks: list[dict[str, Any]],
    use_llm: bool = True,
) -> str:
    playlist = playlist_profile["playlist_name"]
    genre_family = playlist_profile["genre_family"]
    base_md = [
        f"# {playlist} Guide",
        "",
        f"- Genre family: `{genre_family}`",
        f"- Track count: `{playlist_profile['track_count']}`",
        f"- Dominant tags: {', '.join(playlist_profile.get('dominant_tags', []))}",
        "",
        "## Style Axes",
        "",
        *[f"- {k}: {v}" for k, v in playlist_profile.get("style_axes", {}).items()],
        "",
        "## Reference Artists",
        "",
        *[f"- {artist} ({count})" for artist, count in playlist_profile.get("top_artists", [])[:10]],
        "",
        "## Production Notes",
        "",
        *([f"- {n}" for n in playlist_profile.get("summary_notes", [])] or ["- Derived from playlist title and track strings."]),
        "",
        "## Prompt Strategy",
        "",
        "- Build a provider-neutral brief first, then render Suno/fal/OpenRouter-specific artifacts.",
        "- Anchor genre + mood + instrumentation + arrangement cues early in the prompt.",
        "- Add negative constraints to avoid generic results.",
        "",
        "## Example Prompt Seed",
        "",
        "```text",
        f"{', '.join(playlist_profile.get('dominant_tags', []))} {genre_family} track with "
        "clear arrangement arc, polished drums, defined low-end, and memorable hook.",
        "```",
        "",
        "## Sample Tracks (parsed from playlist)",
        "",
        *[
            f"- `{r['track_name']}` -> title=`{r.get('parsed_title')}` artists={', '.join(r.get('parsed_artists') or [])}"
            for r in sample_tracks[:15]
        ],
    ]

    if not use_llm:
        return "\n".join(base_md)

    llm, provider = _select_llm(cfg)
    if llm is None:
        return "\n".join(base_md)
    try:
        system = (
            "You are an expert electronic music analyst and production guide writer. "
            "Return markdown only. Keep the existing structure but improve practical guidance."
        )
        user = json.dumps(
            {
                "playlist_profile": playlist_profile,
                "sample_tracks": sample_tracks[:30],
                "base_markdown": "\n".join(base_md),
                "requirements": [
                    "include production notes",
                    "include prompt strategy for suno/fal/openrouter",
                    "keep concise but practical",
                ],
            },
            ensure_ascii=False,
        )
        refined = llm.generate(system, user)
        if refined and refined.strip():
            return refined
    except Exception:
        pass
    return "\n".join(base_md)
