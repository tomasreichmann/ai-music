from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from ai_music.config import AppConfig
from ai_music.video.images import build_image_provider
from ai_music.video.schemas import (
    AnalyzeSongRequest,
    GenerateSceneImageRequest,
    SaveLyricsRequest,
    TranscribeLyricsRequest,
)
from ai_music.workflows.video_studio import (
    LyricsSavePathError,
    analyze_song_audio,
    generate_scene_image,
    save_song_lyrics,
    transcribe_song_lyrics,
)


def _resolve_local_path(cfg: AppConfig, path: str) -> Path:
    candidate = Path(path)
    resolved = (
        candidate.expanduser().resolve()
        if candidate.is_absolute()
        else (cfg.root_dir / candidate).resolve()
    )
    if cfg.root_dir not in resolved.parents and resolved != cfg.root_dir:
        raise HTTPException(
            status_code=403,
            detail="Requested path must live inside the repository root.",
        )
    if not resolved.exists():
        raise HTTPException(status_code=404, detail=f"File `{resolved}` was not found.")
    return resolved


def create_video_app(cfg: AppConfig) -> FastAPI:
    app = FastAPI(title="AI Music Video Studio API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, object]:
        return {"ok": True, "root": str(cfg.root_dir)}

    @app.post("/api/video/analyze-song")
    def analyze_song(request: AnalyzeSongRequest) -> dict[str, object]:
        return analyze_song_audio(
            cfg=cfg,
            audio_path=Path(request.audioPath),
            song_id=request.songId,
        )

    @app.post("/api/video/transcribe-lyrics")
    def transcribe_lyrics(request: TranscribeLyricsRequest) -> dict[str, object]:
        return transcribe_song_lyrics(
            cfg=cfg,
            audio_path=Path(request.audioPath),
            song_id=request.songId,
            reference_lyrics_path=(
                Path(request.referenceLyricsPath) if request.referenceLyricsPath else None
            ),
            provider_name=request.provider,
            model=request.model,
        )

    @app.post("/api/video/generate-scene-image")
    def generate_image(request: GenerateSceneImageRequest) -> dict[str, object]:
        provider = build_image_provider(request.provider, cfg.providers)
        return generate_scene_image(
            cfg=cfg,
            song_id=request.songId,
            scene_id=request.sceneId,
            prompt=request.prompt,
            negative_prompt=request.negativePrompt,
            width=request.width,
            height=request.height,
            provider=provider,
            model=request.model,
        )

    @app.post("/api/video/save-lyrics")
    def save_lyrics(request: SaveLyricsRequest) -> dict[str, object]:
        try:
            return save_song_lyrics(
                cfg=cfg,
                song_id=request.songId,
                lyrics_source_file=request.lyricsSourceFile,
                lyrics_source_export=request.lyricsSourceExport,
                lyrics=request.lyrics,
            )
        except LyricsSavePathError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/video/local-file")
    def local_file(
        path: str = Query(..., description="Absolute or repo-relative path to a local file."),
    ) -> FileResponse:
        return FileResponse(_resolve_local_path(cfg, path))

    return app
