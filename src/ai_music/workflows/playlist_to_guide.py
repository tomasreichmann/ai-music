from __future__ import annotations

from pathlib import Path
from typing import Any

from ai_music.analyze.guide_generation import build_playlist_guide_markdown
from ai_music.config import AppConfig
from ai_music.io.files import read_json, slugify, write_text


def build_guide_for_playlist(cfg: AppConfig, playlist_name: str, use_llm: bool = True) -> dict[str, Any]:
    profiles_path = cfg.data_dir / "analysis" / "playlist_profiles.json"
    normalized_path = cfg.data_dir / "normalized" / "playlist_rows.normalized.json"
    if not profiles_path.exists():
        raise FileNotFoundError("Missing playlist profiles. Run `playlists analyze` first.")
    if not normalized_path.exists():
        raise FileNotFoundError("Missing normalized playlist rows. Run `playlists normalize` first.")
    profiles = read_json(profiles_path)
    normalized_rows = read_json(normalized_path)

    selected = None
    for profile in profiles.get("profiles", []):
        if profile["playlist_name"].lower() == playlist_name.lower():
            selected = profile
            break
    if selected is None:
        available = ", ".join(sorted(p["playlist_name"] for p in profiles.get("profiles", [])))
        raise ValueError(f"Playlist not found: {playlist_name}. Available: {available}")
    sample_tracks = [r for r in normalized_rows if r["playlist_name"].lower() == playlist_name.lower()]
    md = build_playlist_guide_markdown(cfg, selected, sample_tracks, use_llm=use_llm)
    out_path = cfg.outputs_dir / "guides" / f"{slugify(playlist_name)}.md"
    write_text(out_path, md)
    return {"playlist": playlist_name, "output_path": str(out_path.relative_to(cfg.root_dir))}
