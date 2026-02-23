from __future__ import annotations

import json
import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - optional during bootstrap
    load_dotenv = None


ROOT_DIR = Path(__file__).resolve().parents[2]


def _load_env_files() -> None:
    if load_dotenv is None:
        return
    load_dotenv(ROOT_DIR / ".env.local", override=False)
    load_dotenv(ROOT_DIR / ".env", override=False)


@dataclass(slots=True)
class ProviderConfig:
    openrouter_api_key: str | None
    fal_api_key: str | None
    suno_api_key: str | None
    leonardo_api_key: str | None
    gemini_api_key: str | None
    lastfm_api_key: str | None
    acoustid_api_key: str | None
    musicbrainz_user_agent: str
    ollama_base_url: str
    ffmpeg_path: str | None
    uvr_executable_path: str | None
    uvr_workflow_path: str | None


@dataclass(slots=True)
class AppConfig:
    root_dir: Path
    docs_dir: Path
    playlists_dir: Path
    media_dir: Path
    data_dir: Path
    cache_dir: Path
    outputs_dir: Path
    providers: ProviderConfig

    def ensure_runtime_dirs(self) -> None:
        for path in [
            self.data_dir,
            self.data_dir / "staging",
            self.data_dir / "normalized",
            self.data_dir / "enriched",
            self.data_dir / "analysis",
            self.cache_dir,
            self.cache_dir / "http",
            self.outputs_dir,
            self.outputs_dir / "reports",
            self.outputs_dir / "prompts",
            self.outputs_dir / "guides",
            self.outputs_dir / "media",
            self.outputs_dir / "stems",
        ]:
            path.mkdir(parents=True, exist_ok=True)


def get_app_config() -> AppConfig:
    _load_env_files()
    providers = ProviderConfig(
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
        fal_api_key=os.getenv("FAL_API_KEY"),
        suno_api_key=os.getenv("SUNO_API_KEY"),
        leonardo_api_key=os.getenv("LEONARDO_API_KEY"),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
        lastfm_api_key=os.getenv("LASTFM_API_KEY"),
        acoustid_api_key=os.getenv("ACOUSTID_API_KEY"),
        musicbrainz_user_agent=os.getenv(
            "MUSICBRAINZ_USER_AGENT",
            "ai-music/0.1.0 (local-dev; contact@example.com)",
        ),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        ffmpeg_path=os.getenv("FFMPEG_PATH"),
        uvr_executable_path=os.getenv("UVR_EXECUTABLE_PATH"),
        uvr_workflow_path=os.getenv("UVR_WORKFLOW_PATH"),
    )
    cfg = AppConfig(
        root_dir=ROOT_DIR,
        docs_dir=ROOT_DIR / "docs",
        playlists_dir=ROOT_DIR / "playlists",
        media_dir=ROOT_DIR / "media",
        data_dir=ROOT_DIR / "data",
        cache_dir=ROOT_DIR / "cache",
        outputs_dir=ROOT_DIR / "outputs",
        providers=providers,
    )
    cfg.ensure_runtime_dirs()
    return cfg


def env_doctor_summary() -> dict[str, Any]:
    cfg = get_app_config()
    providers = cfg.providers
    summary: dict[str, Any] = {
        "python_executable": sys.executable,
        "python_version": sys.version.split()[0],
        "ffmpeg_on_path": shutil.which("ffmpeg") is not None,
        "ffmpeg_configured_path": providers.ffmpeg_path,
        "uvr_executable_on_path": shutil.which("UVR") is not None,
        "uvr_configured_path": providers.uvr_executable_path,
        "ollama_reachable": False,
        "providers": {
            "openrouter_key_present": bool(providers.openrouter_api_key),
            "fal_key_present": bool(providers.fal_api_key),
            "suno_key_present": bool(providers.suno_api_key),
            "leonardo_key_present": bool(providers.leonardo_api_key),
            "gemini_key_present": bool(providers.gemini_api_key),
            "lastfm_key_present": bool(providers.lastfm_api_key),
            "acoustid_key_present": bool(providers.acoustid_api_key),
        },
        "paths": {
            "root": str(cfg.root_dir),
            "docs": str(cfg.docs_dir),
            "playlists": str(cfg.playlists_dir),
            "media": str(cfg.media_dir),
            "data": str(cfg.data_dir),
            "cache": str(cfg.cache_dir),
            "outputs": str(cfg.outputs_dir),
        },
    }
    try:
        import httpx  # type: ignore

        resp = httpx.get(f"{providers.ollama_base_url.rstrip('/')}/api/tags", timeout=3.0)
        summary["ollama_reachable"] = resp.status_code == 200
    except Exception:
        summary["ollama_reachable"] = False
    return summary


def dump_summary_json(data: dict[str, Any]) -> str:
    return json.dumps(data, indent=2, sort_keys=True)
