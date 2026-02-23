from __future__ import annotations

from pathlib import Path
from typing import Any

from ai_music.io.files import normalize_loose, stable_hash


AUDIO_EXTS = {".mp3", ".wav", ".flac", ".m4a", ".aiff"}


def index_media_files(media_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not media_dir.exists():
        return rows
    for path in sorted(media_dir.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in AUDIO_EXTS:
            continue
        normalized_name = normalize_loose(path.stem)
        rows.append(
            {
                "media_id": f"med_{stable_hash(str(path.relative_to(media_dir)), normalized_name)}",
                "path": str(path),
                "relative_path": str(path.relative_to(media_dir)),
                "size_bytes": path.stat().st_size,
                "extension": path.suffix.lower(),
                "normalized_name": normalized_name,
            }
        )
    return rows
