from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from ai_music.config import AppConfig
from ai_music.io.files import slugify, write_json, write_text
from ai_music.video.audio_analysis import analyze_audio_file
from ai_music.video.images import ImageProvider, build_image_provider, coerce_generated_asset
from ai_music.video.lyrics import LyricsTranscriber, build_lyrics_transcriber, load_reference_lyrics
from ai_music.video.schemas import LyricsArtifact, SceneImageArtifact


def _relative_path(cfg: AppConfig, path: Path) -> str:
    try:
        return path.relative_to(cfg.root_dir).as_posix()
    except ValueError:
        return path.as_posix()


def _video_song_dir(cfg: AppConfig, song_id: str) -> Path:
    return cfg.outputs_dir / "video" / slugify(song_id)


class LyricsSavePathError(ValueError):
    pass


_TS_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")


def _resolve_repo_path(cfg: AppConfig, target: str) -> Path:
    candidate = Path(target).expanduser()
    resolved = (
        candidate.resolve()
        if candidate.is_absolute()
        else (cfg.root_dir / candidate).resolve()
    )
    root = cfg.root_dir.resolve()
    if root not in resolved.parents and resolved != root:
        raise LyricsSavePathError(
            "Lyrics source file must live inside the repository root."
        )
    return resolved


def _render_lyrics_ts_module(*, export_name: str, lyrics: LyricsArtifact) -> str:
    if not _TS_IDENTIFIER_PATTERN.match(export_name):
        raise ValueError(
            "Lyrics source export must be a valid TypeScript identifier."
        )

    payload_json = json.dumps(
        lyrics.model_dump(mode="json"),
        indent=2,
        sort_keys=True,
        ensure_ascii=False,
    )
    return (
        'import type { LyricsArtifact } from "../../lib/types";\n\n'
        f"export const {export_name}: LyricsArtifact = {payload_json};\n"
    )


def analyze_song_audio(
    *,
    cfg: AppConfig,
    audio_path: Path,
    song_id: str | None = None,
) -> dict[str, Any]:
    resolved_audio = audio_path.expanduser().resolve()
    resolved_song_id = song_id or slugify(resolved_audio.stem)
    analyzed = analyze_audio_file(
        resolved_song_id,
        resolved_audio,
        ffmpeg_path=cfg.providers.ffmpeg_path,
    )
    out_dir = _video_song_dir(cfg, resolved_song_id)
    envelope_path = out_dir / f"{slugify(resolved_song_id)}.envelopes.u8"
    artifact_path = out_dir / f"{slugify(resolved_song_id)}.analysis.json"
    envelope_path.parent.mkdir(parents=True, exist_ok=True)
    envelope_path.write_bytes(analyzed.envelope_bytes)
    artifact = analyzed.artifact.model_copy(
        update={
            "envelopes": analyzed.artifact.envelopes.model_copy(
                update={"binaryPath": _relative_path(cfg, envelope_path)}
            )
        }
    )
    write_json(artifact_path, artifact.model_dump(mode="json"))
    return {
        "song_id": resolved_song_id,
        "artifact_path": _relative_path(cfg, artifact_path),
        "envelope_path": _relative_path(cfg, envelope_path),
        "bpm": artifact.bpm,
        "beat_count": len(artifact.beats),
    }


def generate_scene_image(
    *,
    cfg: AppConfig,
    song_id: str,
    scene_id: str,
    prompt: str,
    provider: ImageProvider | None = None,
    negative_prompt: str | None = None,
    width: int = 1280,
    height: int = 720,
    provider_name: str = "fal",
    model: str | None = None,
) -> dict[str, Any]:
    image_provider = provider or build_image_provider(provider_name, cfg.providers)
    generated = coerce_generated_asset(
        image_provider.generate_image(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            model=model,
        )
    )
    payload = SceneImageArtifact(
        songId=song_id,
        sceneId=scene_id,
        prompt=prompt,
        negativePrompt=negative_prompt,
        image=generated,
        provider=generated.provider,
    )
    out_dir = _video_song_dir(cfg, song_id) / "images"
    manifest_path = out_dir / f"{slugify(scene_id)}.json"
    write_json(manifest_path, payload.model_dump(mode="json"))
    return {
        "song_id": song_id,
        "scene_id": scene_id,
        "provider": generated.provider,
        "metadata_path": _relative_path(cfg, manifest_path),
    }


def transcribe_song_lyrics(
    *,
    cfg: AppConfig,
    audio_path: Path,
    song_id: str | None = None,
    reference_lyrics_path: Path | None = None,
    provider_name: str = "faster-whisper",
    model: str | None = None,
    transcriber: LyricsTranscriber | None = None,
) -> dict[str, Any]:
    resolved_audio = audio_path.expanduser().resolve()
    resolved_song_id = song_id or slugify(resolved_audio.stem)
    lyric_transcriber = transcriber or build_lyrics_transcriber(provider_name)
    reference_lyrics = load_reference_lyrics(reference_lyrics_path)
    payload = lyric_transcriber.transcribe(
        song_id=resolved_song_id,
        audio_path=resolved_audio,
        reference_lyrics=reference_lyrics,
        model=model,
    )
    artifact = (
        payload
        if isinstance(payload, LyricsArtifact)
        else LyricsArtifact.model_validate(payload)
    )

    out_dir = _video_song_dir(cfg, resolved_song_id)
    artifact_path = out_dir / f"{slugify(resolved_song_id)}.lyrics.json"
    write_json(artifact_path, artifact.model_dump(mode="json"))
    return {
        "song_id": resolved_song_id,
        "artifact_path": _relative_path(cfg, artifact_path),
        "line_count": len(artifact.lines),
        "source": artifact.source,
    }


def save_song_lyrics(
    *,
    cfg: AppConfig,
    song_id: str,
    lyrics_source_file: str,
    lyrics_source_export: str,
    lyrics: LyricsArtifact,
) -> dict[str, Any]:
    target_path = _resolve_repo_path(cfg, lyrics_source_file)
    module_text = _render_lyrics_ts_module(
        export_name=lyrics_source_export,
        lyrics=lyrics,
    )
    write_text(target_path, module_text)
    return {
        "song_id": song_id,
        "lyrics_source_file": _relative_path(cfg, target_path),
        "lyrics_source_export": lyrics_source_export,
        "line_count": len(lyrics.lines),
    }
