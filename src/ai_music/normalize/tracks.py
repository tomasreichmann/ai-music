from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from ai_music.io.files import normalize_loose, stable_hash
from ai_music.models.types import RawPlaylistRow


ARTIST_SEP_RE = re.compile(r"\s*(?:·|,|&| x | and )\s*", flags=re.IGNORECASE)
FEAT_RE = re.compile(r"\s+(?:feat\.?|featuring)\s+", flags=re.IGNORECASE)


def parse_track_string(track_name: str) -> dict[str, Any]:
    original = track_name.strip()
    parsed_artists: list[str] = []
    parsed_title: str | None = None
    title_part = original
    if " - " in original:
        left, right = original.split(" - ", 1)
        parsed_title = right.strip() or None
        title_part = right.strip() or original
        artist_blob = left.strip()
        if artist_blob:
            parsed_artists = [a.strip() for a in ARTIST_SEP_RE.split(artist_blob) if a.strip()]
    else:
        parsed_title = original
    feat_split = FEAT_RE.split(title_part, maxsplit=1)
    if len(feat_split) == 2:
        parsed_title = feat_split[0].strip() or parsed_title
    normalized_key = normalize_loose(f"{' '.join(parsed_artists)} {parsed_title or original}")
    return {
        "display_track_name": original,
        "parsed_title": parsed_title,
        "parsed_artists": parsed_artists,
        "normalized_key": normalized_key,
    }


def normalize_rows(rows: list[RawPlaylistRow]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        parsed = parse_track_string(row.track_name)
        source_row_id = f"{row.source_file}:{row.row_index}"
        out.append(
            {
                "source_row_id": source_row_id,
                "source_file": row.source_file,
                "row_index": row.row_index,
                "playlist_name": row.playlist_name,
                "track_name": row.track_name,
                "artist_name": row.artist_name,
                "album": row.album,
                "isrc": row.isrc,
                **parsed,
                "track_candidate_id": f"tc_{stable_hash(source_row_id, parsed['normalized_key'])}",
            }
        )
    return out


def dedupe_normalized_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    by_key: dict[str, dict[str, Any]] = {}
    canonical: list[dict[str, Any]] = []
    alias_map: list[dict[str, Any]] = []
    for row in rows:
        key = row["normalized_key"] or normalize_loose(row["track_name"])
        if key not in by_key:
            track_id = f"trk_{stable_hash(key)}"
            item = {
                "track_id": track_id,
                "canonical_key": key,
                "canonical_title": row.get("parsed_title") or row["track_name"],
                "canonical_artists": row.get("parsed_artists") or [],
                "aliases": [row["track_name"]],
                "source_rows": [row["source_row_id"]],
                "playlists": [row["playlist_name"]],
                "isrc": row.get("isrc"),
            }
            by_key[key] = item
            canonical.append(item)
        else:
            existing = by_key[key]
            if row["track_name"] not in existing["aliases"]:
                existing["aliases"].append(row["track_name"])
            if row["source_row_id"] not in existing["source_rows"]:
                existing["source_rows"].append(row["source_row_id"])
            if row["playlist_name"] not in existing["playlists"]:
                existing["playlists"].append(row["playlist_name"])
        alias_map.append(
            {
                "source_row_id": row["source_row_id"],
                "track_id": by_key[key]["track_id"],
                "normalized_key": key,
                "track_name": row["track_name"],
                "playlist_name": row["playlist_name"],
            }
        )
    return canonical, alias_map


def fuzzy_candidates(rows: list[dict[str, Any]], threshold: float = 0.9, max_results: int = 3) -> list[dict[str, Any]]:
    items = [(r["source_row_id"], r["normalized_key"], r["track_name"]) for r in rows]
    results: list[dict[str, Any]] = []
    for i in range(len(items)):
        ida, ka, ta = items[i]
        if not ka:
            continue
        local: list[dict[str, Any]] = []
        for j in range(i + 1, len(items)):
            idb, kb, tb = items[j]
            if not kb:
                continue
            score = SequenceMatcher(None, ka, kb).ratio()
            if score >= threshold and ka != kb:
                local.append(
                    {
                        "left_source_row_id": ida,
                        "right_source_row_id": idb,
                        "left_track_name": ta,
                        "right_track_name": tb,
                        "score": round(score, 4),
                    }
                )
        results.extend(sorted(local, key=lambda x: x["score"], reverse=True)[:max_results])
    return results
