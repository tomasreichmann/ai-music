from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ai_music.config import AppConfig
from ai_music.io.files import read_json, slugify, write_json, write_text
from ai_music.llm.openrouter_client import OpenRouterClient
from ai_music.suno.adaptation import adapt_baseline_prompt
from ai_music.suno.analysis import build_prompt_baseline, filter_high_signal_originals
from ai_music.suno.api_client import SunoApiClient
from ai_music.suno.mapping import load_mapping_config, normalize_page_payload
from ai_music.suno.schemas import SunoSongRecord


def _resolve_path(cfg: AppConfig, path: Path) -> Path:
    if path.is_absolute():
        return path
    if path.exists():
        return path.resolve()
    return (cfg.root_dir / path).resolve()


def _relative_path(cfg: AppConfig, path: Path) -> str:
    try:
        return str(path.relative_to(cfg.root_dir))
    except ValueError:
        return str(path)


def _load_fixture_pages(paths: list[Path]) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    for path in paths:
        payload = read_json(path)
        if not isinstance(payload, dict):
            raise ValueError(f"Fixture page at '{path}' must be a JSON object.")
        pages.append(payload)
    return pages


def fetch_suno_created_songs(
    cfg: AppConfig,
    mapping_config_path: Path,
    window_size: int = 500,
    page_size: int | None = None,
    max_pages: int = 100,
    fixture_pages: list[Path] | None = None,
) -> dict[str, Any]:
    mapping_path = _resolve_path(cfg, mapping_config_path)
    mapping = load_mapping_config(mapping_path)

    raw_pages: list[dict[str, Any]] = []
    normalized_songs: list[SunoSongRecord] = []

    if fixture_pages:
        resolved = [_resolve_path(cfg, p) for p in fixture_pages]
        raw_pages = _load_fixture_pages(resolved)
        for page in raw_pages:
            page_songs, _ = normalize_page_payload(page, mapping)
            normalized_songs.extend(page_songs)
            if len(normalized_songs) >= window_size:
                normalized_songs = normalized_songs[:window_size]
                break
    else:
        if not cfg.providers.suno_api_key:
            raise ValueError("SUNO_API_KEY is required for live fetch mode.")
        client = SunoApiClient(cfg.providers.suno_api_key)
        cursor: str | None = None
        seen_cursors: set[str] = set()
        for _ in range(max_pages):
            page = client.fetch_created_page(mapping, cursor=cursor, page_size=page_size)
            raw_pages.append(page)
            page_songs, next_cursor = normalize_page_payload(page, mapping)
            normalized_songs.extend(page_songs)
            if len(normalized_songs) >= window_size:
                normalized_songs = normalized_songs[:window_size]
                break
            if not next_cursor or next_cursor in seen_cursors:
                break
            seen_cursors.add(next_cursor)
            cursor = next_cursor

    raw_out = cfg.data_dir / "staging" / "suno_created.raw.json"
    normalized_out = cfg.data_dir / "normalized" / "suno_created.normalized.json"
    raw_payload = {
        "page_count": len(raw_pages),
        "fetched_song_count": len(normalized_songs),
        "mapping_config": str(mapping_path),
        "pages": raw_pages,
    }
    write_json(raw_out, raw_payload)
    write_json(normalized_out, [song.model_dump(mode="json") for song in normalized_songs])
    return {
        "page_count": len(raw_pages),
        "fetched_song_count": len(normalized_songs),
        "raw_path": _relative_path(cfg, raw_out),
        "normalized_path": _relative_path(cfg, normalized_out),
    }


def analyze_suno_created_songs(
    cfg: AppConfig,
    style_query: str,
    aliases_config_path: Path,
    normalized_songs_path: Path | None = None,
    min_likes: int = 1,
) -> dict[str, Any]:
    normalized_path = _resolve_path(
        cfg,
        normalized_songs_path or Path("data/normalized/suno_created.normalized.json"),
    )
    alias_path = _resolve_path(cfg, aliases_config_path)

    rows = read_json(normalized_path)
    if not isinstance(rows, list):
        raise ValueError("Normalized Suno songs file must contain a JSON list.")
    songs = [SunoSongRecord.model_validate(row) for row in rows]
    filtered, filter_report = filter_high_signal_originals(songs, min_likes=min_likes)

    alias_payload = read_json(alias_path)
    if not isinstance(alias_payload, dict):
        raise ValueError("Alias config must be a JSON object.")
    alias_map = {
        str(k).strip().lower(): [str(v).strip().lower() for v in values if str(v).strip()]
        for k, values in alias_payload.items()
        if isinstance(values, list)
    }
    baseline_payload = build_prompt_baseline(filtered, style_query=style_query, alias_map=alias_map)

    filter_report_out = cfg.outputs_dir / "reports" / "suno_source_filter_report.json"
    baseline_slug = slugify(style_query)
    baseline_out = cfg.outputs_dir / "reports" / f"suno_prompt_baseline_{baseline_slug}.json"
    full_payload = {
        "style_query": style_query,
        "source_song_count": len(songs),
        "filtered_song_count": len(filtered),
        "filter_report": filter_report,
        **baseline_payload,
    }
    write_json(filter_report_out, filter_report)
    write_json(baseline_out, full_payload)
    return {
        "style_query": style_query,
        "selected_count": baseline_payload["selected_count"],
        "filter_report_path": _relative_path(cfg, filter_report_out),
        "baseline_path": _relative_path(cfg, baseline_out),
    }


def adapt_suno_prompt_baseline(
    cfg: AppConfig,
    baseline_path: Path,
    theme: str,
    model: str | None = None,
    llm_client: Any | None = None,
    preserve_controls: bool = True,
) -> dict[str, Any]:
    resolved_baseline_path = _resolve_path(cfg, baseline_path)
    payload = read_json(resolved_baseline_path)
    if not isinstance(payload, dict):
        raise ValueError("Baseline JSON must be an object.")
    baseline = payload.get("baseline", payload)
    if not isinstance(baseline, dict):
        raise ValueError("Baseline JSON must contain a 'baseline' object or be a baseline object.")

    client = llm_client
    if client is None:
        if not cfg.providers.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is required for adaptation.")
        client = OpenRouterClient(cfg.providers.openrouter_api_key)

    adapted = adapt_baseline_prompt(
        baseline=baseline,
        theme=theme,
        llm_client=client,
        model=model,
        preserve_controls=preserve_controls,
    )
    style_query = str(payload.get("style_query", "")).strip()
    slug = slugify(f"{style_query}-{theme}" if style_query else theme)
    json_out = cfg.outputs_dir / "prompts" / "providers" / "suno" / f"suno_adapted_{slug}.json"
    md_out = cfg.outputs_dir / "prompts" / "providers" / "suno" / f"suno_adapted_{slug}.md"

    write_json(json_out, adapted.model_dump(mode="json"))
    md = "\n".join(
        [
            "# Suno Adapted Prompt",
            "",
            f"- Theme: `{theme}`",
            f"- Source baseline: `{_relative_path(cfg, resolved_baseline_path)}`",
            "",
            "## Styles",
            "",
            adapted.style_prompt,
            "",
            "## Exclude Styles",
            "",
            ", ".join(adapted.exclude_styles) if adapted.exclude_styles else "(none)",
            "",
            "## Sliders",
            "",
            f"- Weirdness: `{adapted.weirdness}`",
            f"- Style Influence: `{adapted.style_influence}`",
            "",
            "## Lyrics",
            "",
            adapted.lyrics or "(instrumental)",
            "",
            "## Title",
            "",
            adapted.song_title,
            "",
            "## Rationale",
            "",
            adapted.rationale,
        ]
    )
    write_text(md_out, md)
    return {
        "json_path": _relative_path(cfg, json_out),
        "markdown_path": _relative_path(cfg, md_out),
        "theme": theme,
        "song_title": adapted.song_title,
    }


def mine_suno_prompt_pack(
    cfg: AppConfig,
    mapping_config_path: Path,
    aliases_config_path: Path,
    style_query: str,
    theme: str,
    window_size: int = 500,
    page_size: int | None = None,
    fixture_pages: list[Path] | None = None,
    model: str | None = None,
    llm_client: Any | None = None,
) -> dict[str, Any]:
    fetched = fetch_suno_created_songs(
        cfg=cfg,
        mapping_config_path=mapping_config_path,
        window_size=window_size,
        page_size=page_size,
        fixture_pages=fixture_pages,
    )
    analyzed = analyze_suno_created_songs(
        cfg=cfg,
        style_query=style_query,
        aliases_config_path=aliases_config_path,
        normalized_songs_path=Path(fetched["normalized_path"]),
    )
    adapted = adapt_suno_prompt_baseline(
        cfg=cfg,
        baseline_path=Path(analyzed["baseline_path"]),
        theme=theme,
        model=model,
        llm_client=llm_client,
    )
    summary_out = cfg.outputs_dir / "reports" / "suno_mine_summary.json"
    write_json(summary_out, {"fetch": fetched, "analyze": analyzed, "adapt": adapted})
    return {"fetch": fetched, "analyze": analyzed, "adapt": adapted, "summary_path": _relative_path(cfg, summary_out)}
