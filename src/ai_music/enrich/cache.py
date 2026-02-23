from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ai_music.io.files import ensure_parent, stable_hash


def cache_path(cache_dir: Path, namespace: str, key: str) -> Path:
    return cache_dir / "http" / namespace / f"{stable_hash(key, length=20)}.json"


def cache_get(cache_dir: Path, namespace: str, key: str) -> Any | None:
    path = cache_path(cache_dir, namespace, key)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def cache_set(cache_dir: Path, namespace: str, key: str, value: Any) -> Path:
    path = cache_path(cache_dir, namespace, key)
    ensure_parent(path)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    return path
