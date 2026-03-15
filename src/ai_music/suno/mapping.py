from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from ai_music.io.files import read_json
from ai_music.suno.schemas import SunoMappingConfig, SunoSongRecord


_TOKEN_RE = re.compile(r"[^a-z0-9]+")


def load_mapping_config(path: Path) -> SunoMappingConfig:
    payload = read_json(path)
    return SunoMappingConfig.model_validate(payload)


def extract_path(payload: Any, path: str) -> Any:
    if not path:
        return payload
    current = payload
    for segment in path.split("."):
        if isinstance(current, list):
            try:
                index = int(segment)
            except ValueError as exc:  # pragma: no cover - defensive
                raise ValueError(f"Path segment '{segment}' is not a list index in '{path}'") from exc
            if index < 0 or index >= len(current):
                raise ValueError(f"List index '{segment}' out of range for path '{path}'")
            current = current[index]
            continue
        if not isinstance(current, dict):
            raise ValueError(f"Cannot descend into non-object segment '{segment}' for path '{path}'")
        if segment not in current:
            raise ValueError(f"Missing path segment '{segment}' for path '{path}'")
        current = current[segment]
    return current


def parse_bool_flag(
    value: Any,
    truthy_values: list[str] | None = None,
    falsy_values: list[str] | None = None,
) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if value == 1:
            return True
        if value == 0:
            return False
    normalized = str(value).strip().lower()
    truthy = {x.strip().lower() for x in (truthy_values or ["true", "1", "yes", "y", "on"])}
    falsy = {x.strip().lower() for x in (falsy_values or ["false", "0", "no", "n", "off"])}
    if normalized in truthy:
        return True
    if normalized in falsy:
        return False
    return None


def _parse_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_exclude_styles(value: Any, delimiters: list[str]) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        parts = [text]
        for delimiter in delimiters:
            expanded: list[str] = []
            for part in parts:
                expanded.extend(part.split(delimiter))
            parts = expanded
        return [p.strip() for p in parts if p.strip()]
    return []


def _required(payload: dict[str, Any], key: str) -> Any:
    if key not in payload:
        raise ValueError(f"Missing required field mapping '{key}'")
    return payload[key]


def normalize_song_payload(raw_song: dict[str, Any], mapping: SunoMappingConfig) -> SunoSongRecord:
    fields = mapping.response.fields
    normalization = mapping.normalization

    def get(field_name: str) -> Any:
        path = _required(fields, field_name)
        return extract_path(raw_song, str(path))

    likes_value = _parse_int(get("likes")) or 0
    weirdness_value = _parse_int(get("weirdness"))
    style_influence_value = _parse_int(get("style_influence"))

    return SunoSongRecord(
        song_id=str(get("song_id")),
        title=str(get("title")),
        created_at=str(get("created_at")) if get("created_at") is not None else None,
        likes=likes_value,
        is_cover=parse_bool_flag(
            get("is_cover"), normalization.truthy_values, normalization.falsy_values
        ),
        is_remaster=parse_bool_flag(
            get("is_remaster"), normalization.truthy_values, normalization.falsy_values
        ),
        is_sample_derived=parse_bool_flag(
            get("is_sample_derived"), normalization.truthy_values, normalization.falsy_values
        ),
        depends_on_existing=parse_bool_flag(
            get("depends_on_existing"), normalization.truthy_values, normalization.falsy_values
        ),
        is_uploaded=parse_bool_flag(
            get("is_uploaded"), normalization.truthy_values, normalization.falsy_values
        ),
        style_prompt=str(get("style_prompt") or ""),
        exclude_styles=_parse_exclude_styles(
            get("exclude_styles"), mapping.normalization.exclude_styles_delimiters
        ),
        weirdness=weirdness_value,
        style_influence=style_influence_value,
        lyrics=str(get("lyrics") or ""),
        source_payload=raw_song,
    )


def normalize_page_payload(
    page_payload: dict[str, Any],
    mapping: SunoMappingConfig,
) -> tuple[list[SunoSongRecord], str | None]:
    songs_node = extract_path(page_payload, mapping.response.songs_path)
    if not isinstance(songs_node, list):
        raise ValueError(f"Mapped songs_path '{mapping.response.songs_path}' did not resolve to a list")
    songs = [normalize_song_payload(raw_song, mapping) for raw_song in songs_node if isinstance(raw_song, dict)]

    next_cursor_raw = extract_path(page_payload, mapping.response.next_cursor_path)
    next_cursor = str(next_cursor_raw).strip() if next_cursor_raw not in (None, "") else None
    return songs, next_cursor


def normalize_query_tokens(text: str) -> list[str]:
    out: list[str] = []
    for raw in text.lower().split():
        token = _TOKEN_RE.sub("", raw)
        if token:
            out.append(token)
    return out
