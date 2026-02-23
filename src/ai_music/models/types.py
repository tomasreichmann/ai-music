from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class GuideChunk:
    chunk_id: str
    source_file: str
    heading_path: list[str]
    text: str
    tags: list[str]
    token_estimate: int


@dataclass(slots=True)
class RawPlaylistRow:
    source_file: str
    row_index: int
    track_name: str
    artist_name: str | None
    album: str | None
    playlist_name: str
    row_type: str | None
    isrc: str | None


@dataclass(slots=True)
class TrackEntity:
    track_id: str
    canonical_title: str
    canonical_artists: list[str] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)
    source_rows: list[str] = field(default_factory=list)
    provider_ids: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class PlaylistProfile:
    playlist_name: str
    genre_family: str
    track_count: int
    style_axes: dict[str, float]
    dominant_tags: list[str]
    reference_artists: list[str]
    summary_notes: list[str]


@dataclass(slots=True)
class MediaFile:
    media_id: str
    path: str
    size_bytes: int
    extension: str
    normalized_name: str
    playlist_match_candidates: list[dict[str, Any]] = field(default_factory=list)


@dataclass(slots=True)
class StemSplitJob:
    job_id: str
    media_id: str
    backend: str
    profile: str
    status: str
    device: str
    outputs: dict[str, str] = field(default_factory=dict)
    runtime_ms: int = 0
    error: str | None = None
