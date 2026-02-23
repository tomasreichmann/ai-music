from __future__ import annotations

import csv
from pathlib import Path

from ai_music.models.types import RawPlaylistRow


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def read_playlist_csv(path: Path) -> list[RawPlaylistRow]:
    rows: list[RawPlaylistRow] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            track_name = _clean(row.get("Track name")) or ""
            playlist_name = _clean(row.get("Playlist name")) or path.stem
            if not track_name:
                continue
            rows.append(
                RawPlaylistRow(
                    source_file=path.name,
                    row_index=idx,
                    track_name=track_name,
                    artist_name=_clean(row.get("Artist name")),
                    album=_clean(row.get("Album")),
                    playlist_name=playlist_name,
                    row_type=_clean(row.get("Type")),
                    isrc=_clean(row.get("ISRC")),
                )
            )
    return rows


def load_all_playlists(playlists_dir: Path) -> list[RawPlaylistRow]:
    rows: list[RawPlaylistRow] = []
    for path in sorted(playlists_dir.glob("*.csv")):
        rows.extend(read_playlist_csv(path))
    return rows
