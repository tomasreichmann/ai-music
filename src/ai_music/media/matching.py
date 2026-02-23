from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from ai_music.io.files import normalize_loose


def match_media_to_playlist(
    media_rows: list[dict[str, Any]],
    playlist_rows: list[dict[str, Any]],
    playlist_name: str | None = None,
    high_conf_threshold: float = 0.93,
) -> dict[str, Any]:
    candidates = playlist_rows
    if playlist_name:
        candidates = [row for row in playlist_rows if row["playlist_name"].lower() == playlist_name.lower()]
    p_index = [
        {
            "source_row_id": row["source_row_id"],
            "playlist_name": row["playlist_name"],
            "track_name": row["track_name"],
            "normalized_key": row["normalized_key"] or normalize_loose(row["track_name"]),
        }
        for row in candidates
    ]
    exact_matches: list[dict[str, Any]] = []
    fuzzy_matches: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    by_norm: dict[str, list[dict[str, Any]]] = {}
    for p in p_index:
        by_norm.setdefault(p["normalized_key"], []).append(p)

    for media in media_rows:
        norm = media["normalized_name"]
        if norm in by_norm:
            for hit in by_norm[norm]:
                exact_matches.append(
                    {
                        "media_id": media["media_id"],
                        "media_path": media["relative_path"],
                        "playlist_name": hit["playlist_name"],
                        "source_row_id": hit["source_row_id"],
                        "track_name": hit["track_name"],
                        "score": 1.0,
                        "match_type": "exact",
                    }
                )
            continue
        scored: list[dict[str, Any]] = []
        for p in p_index:
            score = SequenceMatcher(None, norm, p["normalized_key"]).ratio()
            if score < 0.75:
                continue
            scored.append(
                {
                    "media_id": media["media_id"],
                    "media_path": media["relative_path"],
                    "playlist_name": p["playlist_name"],
                    "source_row_id": p["source_row_id"],
                    "track_name": p["track_name"],
                    "score": round(score, 4),
                    "match_type": "fuzzy",
                }
            )
        scored.sort(key=lambda x: x["score"], reverse=True)
        if scored:
            fuzzy_matches.extend(scored[:3])
            if scored[0]["score"] < high_conf_threshold:
                unresolved.append(
                    {
                        "media_id": media["media_id"],
                        "media_path": media["relative_path"],
                        "best_score": scored[0]["score"],
                        "best_track_name": scored[0]["track_name"],
                        "reason": "low_confidence",
                    }
                )
        else:
            unresolved.append(
                {
                    "media_id": media["media_id"],
                    "media_path": media["relative_path"],
                    "best_score": 0.0,
                    "best_track_name": None,
                    "reason": "no_candidate",
                }
            )
    return {
        "exact_matches": exact_matches,
        "fuzzy_matches": fuzzy_matches,
        "unresolved": unresolved,
        "summary": {
            "media_count": len(media_rows),
            "playlist_candidate_count": len(candidates),
            "exact_match_count": len({m["media_id"] for m in exact_matches}),
            "fuzzy_match_rows": len(fuzzy_matches),
            "unresolved_count": len(unresolved),
        },
    }
