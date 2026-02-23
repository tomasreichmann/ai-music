from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ai_music.config import AppConfig
from ai_music.io.files import read_json, stable_hash, write_json
from ai_music.stems.uvr_backend import UVRBackend


def run_stem_split_batch(
    cfg: AppConfig,
    backend: str = "uvr",
    profile: str = "4stem",
    device: str = "cuda",
    dry_run: bool = True,
    overwrite: bool = False,
    limit: int | None = None,
) -> dict[str, Any]:
    if backend != "uvr":
        raise ValueError("Only `uvr` backend is implemented in MVP.")
    media_index_path = cfg.data_dir / "analysis" / "media_index.json"
    if not media_index_path.exists():
        raise FileNotFoundError("Missing media index. Run `media index` first.")
    media_index = read_json(media_index_path)
    media_rows = media_index.get("files", [])
    if limit is not None:
        media_rows = media_rows[: max(limit, 0)]
    splitter = UVRBackend(cfg)
    jobs: list[dict[str, Any]] = []
    for media in media_rows:
        track_out = cfg.outputs_dir / "stems" / profile / media["media_id"]
        result = splitter.split(
            input_path=media["path"],
            output_dir=str(track_out),
            profile=profile,
            device=device,
            dry_run=dry_run,
            overwrite=overwrite,
        )
        jobs.append(
            {
                "job_id": f"stem_{stable_hash(media['media_id'], backend, profile)}",
                "media_id": media["media_id"],
                "media_path": media["relative_path"],
                "backend": backend,
                "profile": profile,
                "device": device,
                "status": result.status,
                "runtime_ms": result.runtime_ms,
                "command": result.command,
                "outputs": result.outputs,
                "error": result.error,
            }
        )
    manifest = {
        "backend": backend,
        "profile": profile,
        "dry_run": dry_run,
        "device": device,
        "job_count": len(jobs),
        "jobs": jobs,
    }
    manifest_name = f"stem_manifest_{backend}_{profile}_{'dryrun' if dry_run else 'run'}.json"
    out_path = cfg.outputs_dir / "stems" / manifest_name
    write_json(out_path, manifest)
    return {"manifest_path": str(out_path.relative_to(cfg.root_dir)), "job_count": len(jobs), "dry_run": dry_run}
