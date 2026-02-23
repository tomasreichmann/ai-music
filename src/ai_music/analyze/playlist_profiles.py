from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from ai_music.io.files import normalize_loose


def infer_genre_family(playlist_name: str) -> str:
    n = playlist_name.lower()
    if any(k in n for k in ["dnb", "drum", "jungle"]):
        return "dnb"
    if any(k in n for k in ["edm", "house", "melodic", "progressive"]):
        return "edm"
    return "electronic"


def compute_playlist_stats(raw_rows: list[dict[str, Any]], normalized_rows: list[dict[str, Any]]) -> dict[str, Any]:
    per_playlist: dict[str, dict[str, Any]] = {}
    grouped_norm: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in normalized_rows:
        grouped_norm[row["playlist_name"]].append(row)
    grouped_raw: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in raw_rows:
        grouped_raw[row["playlist_name"]].append(row)

    for playlist, rows in grouped_norm.items():
        artists = [a for row in rows for a in row.get("parsed_artists", [])]
        artist_counts = Counter(artists)
        lex = " ".join(normalize_loose(row["track_name"]) for row in rows)
        style_axes = {
            "energy": 0.8 if any(k in playlist.lower() for k in ["heavy", "beast", "aggressive"]) else 0.45,
            "melodic": 0.8 if any(k in playlist.lower() for k in ["liquid", "chill", "melodic"]) else 0.5,
            "club": 0.8 if any(k in playlist.lower() for k in ["hits", "afterparty", "epic"]) else 0.55,
        }
        notes = []
        if "remix" in lex:
            notes.append("High remix presence in track titles.")
        if any(k in lex for k in ["vip", "extended"]):
            notes.append("Contains VIP/extended mix references.")
        per_playlist[playlist] = {
            "playlist_name": playlist,
            "genre_family": infer_genre_family(playlist),
            "track_count": len(rows),
            "raw_row_count": len(grouped_raw.get(playlist, [])),
            "top_artists": artist_counts.most_common(15),
            "style_axes": style_axes,
            "dominant_tags": _dominant_tags_from_name(playlist),
            "summary_notes": notes,
        }
    return per_playlist


def compute_overlaps(normalized_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tracks_by_playlist: dict[str, set[str]] = defaultdict(set)
    for row in normalized_rows:
        tracks_by_playlist[row["playlist_name"]].add(row["normalized_key"])
    names = sorted(tracks_by_playlist)
    overlaps: list[dict[str, Any]] = []
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            shared = tracks_by_playlist[a] & tracks_by_playlist[b]
            if not shared:
                continue
            overlaps.append({"left": a, "right": b, "shared_count": len(shared)})
    return sorted(overlaps, key=lambda x: x["shared_count"], reverse=True)


def _dominant_tags_from_name(playlist_name: str) -> list[str]:
    n = playlist_name.lower()
    tags = ["electronic"]
    mapping = {
        "dnb": ["drum-and-bass"],
        "jungle": ["jungle", "breakbeats"],
        "liquid": ["liquid", "melodic", "emotive"],
        "heavy": ["heavy", "aggressive"],
        "beast": ["heavy", "festival"],
        "epic": ["cinematic", "anthemic"],
        "afterparty": ["late-night", "club"],
        "chill": ["chill", "deep", "melodic"],
        "melodic": ["melodic"],
        "house": ["house"],
        "progressive": ["progressive"],
        "hits": ["popular", "accessible"],
        "slow": ["slower-groove"],
    }
    for key, vals in mapping.items():
        if key in n:
            tags.extend(vals)
    deduped: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        if tag not in seen:
            seen.add(tag)
            deduped.append(tag)
    return deduped
