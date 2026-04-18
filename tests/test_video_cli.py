from __future__ import annotations

import json
from pathlib import Path

from ai_music.cli import app
from ai_music.config import AppConfig, ProviderConfig
from typer.testing import CliRunner


def _cfg(root: Path) -> AppConfig:
    providers = ProviderConfig(
        openrouter_api_key=None,
        fal_api_key="test-fal-key",
        suno_api_key=None,
        leonardo_api_key=None,
        gemini_api_key=None,
        lastfm_api_key=None,
        acoustid_api_key=None,
        musicbrainz_user_agent="ai-music-test/0.1.0",
        ollama_base_url="http://localhost:11434",
        ffmpeg_path=None,
        uvr_executable_path=None,
        uvr_workflow_path=None,
    )
    cfg = AppConfig(
        root_dir=root,
        docs_dir=root / "docs",
        playlists_dir=root / "playlists",
        media_dir=root / "media",
        data_dir=root / "data",
        cache_dir=root / "cache",
        outputs_dir=root / "outputs",
        providers=providers,
    )
    cfg.ensure_runtime_dirs()
    return cfg


def test_video_cli_analyze_and_generate_scene_image(monkeypatch, tmp_path: Path) -> None:
    runner = CliRunner()
    cfg = _cfg(tmp_path)

    monkeypatch.setattr("ai_music.cli._cfg", lambda: cfg)
    monkeypatch.setattr(
        "ai_music.cli.analyze_song_audio",
        lambda **kwargs: {
            "song_id": kwargs["song_id"],
            "artifact_path": "outputs/video/test-song/test-song.analysis.json",
            "envelope_path": "outputs/video/test-song/test-song.envelopes.u8",
            "bpm": 128.0,
            "beat_count": 64,
        },
    )
    monkeypatch.setattr(
        "ai_music.cli.generate_scene_image",
        lambda **kwargs: {
            "song_id": kwargs["song_id"],
            "scene_id": kwargs["scene_id"],
            "provider": "fake-image",
            "metadata_path": "outputs/video/test-song/images/intro.json",
        },
    )
    monkeypatch.setattr(
        "ai_music.cli.transcribe_song_lyrics",
        lambda **kwargs: {
            "song_id": kwargs["song_id"],
            "artifact_path": "outputs/video/test-song/test-song.lyrics.json",
            "line_count": 12,
            "source": "fake-transcriber",
        },
    )

    analyzed = runner.invoke(
        app,
        [
            "video",
            "analyze-song",
            "--audio-path",
            "C:/music/test-song.wav",
            "--song-id",
            "test-song",
        ],
    )
    assert analyzed.exit_code == 0
    assert json.loads(analyzed.stdout)["bpm"] == 128.0
    assert json.loads(analyzed.stdout)["envelope_path"].endswith(".u8")

    generated = runner.invoke(
        app,
        [
            "video",
            "generate-scene-image",
            "--song-id",
            "test-song",
            "--scene-id",
            "intro",
            "--prompt",
            "glowing skyline over water",
        ],
    )
    assert generated.exit_code == 0
    assert json.loads(generated.stdout)["provider"] == "fake-image"

    transcribed = runner.invoke(
        app,
        [
            "video",
            "transcribe-lyrics",
            "--audio-path",
            "C:/music/test-song.wav",
            "--song-id",
            "test-song",
            "--reference-lyrics-path",
            "C:/music/test-song.lyrics.txt",
        ],
    )
    assert transcribed.exit_code == 0
    assert json.loads(transcribed.stdout)["line_count"] == 12


def test_video_cli_serve_calls_uvicorn(monkeypatch, tmp_path: Path) -> None:
    runner = CliRunner()
    cfg = _cfg(tmp_path)
    captured: dict[str, object] = {}

    monkeypatch.setattr("ai_music.cli._cfg", lambda: cfg)
    monkeypatch.setattr(
        "ai_music.cli.uvicorn.run",
        lambda app, host, port: captured.update({"app": app, "host": host, "port": port}),
    )

    result = runner.invoke(app, ["video", "serve", "--host", "127.0.0.1", "--port", "9876"])

    assert result.exit_code == 0
    assert captured["host"] == "127.0.0.1"
    assert captured["port"] == 9876
