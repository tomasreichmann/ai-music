from __future__ import annotations

from pathlib import Path

from ai_music.config import AppConfig, ProviderConfig
from ai_music.video.api import create_video_app
from fastapi.testclient import TestClient


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


def test_video_api_routes_analysis_and_generation(monkeypatch, tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)

    monkeypatch.setattr(
        "ai_music.video.api.analyze_song_audio",
        lambda **kwargs: {
            "song_id": kwargs["song_id"],
            "artifact_path": "outputs/video/test-song/test-song.analysis.json",
            "envelope_path": "outputs/video/test-song/test-song.envelopes.u8",
            "bpm": 128.0,
            "beat_count": 64,
        },
    )
    monkeypatch.setattr(
        "ai_music.video.api.generate_scene_image",
        lambda **kwargs: {
            "song_id": kwargs["song_id"],
            "scene_id": kwargs["scene_id"],
            "provider": "fake-image",
            "metadata_path": "outputs/video/test-song/images/test-scene.json",
        },
    )
    monkeypatch.setattr(
        "ai_music.video.api.transcribe_song_lyrics",
        lambda **kwargs: {
            "song_id": kwargs["song_id"],
            "artifact_path": "outputs/video/test-song/test-song.lyrics.json",
            "line_count": 12,
            "source": "fake-transcriber",
        },
    )

    client = TestClient(create_video_app(cfg))

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["ok"] is True

    analyzed = client.post(
        "/api/video/analyze-song",
        json={"audioPath": "C:/music/test-song.wav", "songId": "test-song"},
    )
    assert analyzed.status_code == 200
    assert analyzed.json()["bpm"] == 128.0
    assert analyzed.json()["envelope_path"].endswith(".u8")

    generated = client.post(
        "/api/video/generate-scene-image",
        json={
            "songId": "test-song",
            "sceneId": "intro",
            "prompt": "glowing skyline over water",
            "negativePrompt": "text",
            "width": 1024,
            "height": 576,
            "provider": "fal",
        },
    )
    assert generated.status_code == 200
    assert generated.json()["provider"] == "fake-image"

    transcribed = client.post(
        "/api/video/transcribe-lyrics",
        json={
            "audioPath": "C:/music/test-song.wav",
            "songId": "test-song",
            "referenceLyricsPath": "C:/music/test-song.lyrics.txt",
        },
    )
    assert transcribed.status_code == 200
    assert transcribed.json()["line_count"] == 12


def test_video_api_serves_local_files(tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)
    payload_path = cfg.root_dir / "outputs" / "video" / "sample.txt"
    payload_path.parent.mkdir(parents=True, exist_ok=True)
    payload_path.write_text("bassline", encoding="utf-8")

    client = TestClient(create_video_app(cfg))
    response = client.get("/api/video/local-file", params={"path": str(payload_path)})

    assert response.status_code == 200
    assert response.text == "bassline"


def test_video_api_allows_local_frontend_origin(tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)
    client = TestClient(create_video_app(cfg))

    response = client.get("/health", headers={"Origin": "http://127.0.0.1:4173"})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"


def test_video_api_save_lyrics_writes_source_module(tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)
    client = TestClient(create_video_app(cfg))
    source_file = "apps/video-studio/src/songs/lostAnotherHour/lyrics.ts"
    payload = {
        "songId": "lost-another-hour-to-the-bass",
        "lyricsSourceFile": source_file,
        "lyricsSourceExport": "lostAnotherHourLyrics",
        "lyrics": {
            "songId": "lost-another-hour-to-the-bass",
            "audioPath": "outputs/tracks/Lost Another Hour to the Bass.wav",
            "source": "manual-timing-pass",
            "referenceText": "Found a white baggie...",
            "lines": [
                {
                    "id": "line-1",
                    "text": "Found a white baggie...",
                    "startBeat": 13,
                    "endBeat": 16,
                    "words": [
                        {"text": "Found", "startBeat": 13, "endBeat": 14},
                        {"text": "a", "startBeat": 14, "endBeat": 14.5},
                        {"text": "white", "startBeat": 14.5, "endBeat": 15.25},
                        {"text": "baggie...", "startBeat": 15.25, "endBeat": 16},
                    ],
                }
            ],
        },
    }

    response = client.post("/api/video/save-lyrics", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["song_id"] == payload["songId"]
    assert body["lyrics_source_file"] == source_file
    assert body["lyrics_source_export"] == payload["lyricsSourceExport"]
    assert body["line_count"] == 1

    written_path = cfg.root_dir / source_file
    assert written_path.exists()
    content = written_path.read_text(encoding="utf-8")
    assert 'import type { LyricsArtifact } from "../../lib/types";' in content
    assert (
        "export const lostAnotherHourLyrics: LyricsArtifact = {" in content
    )
    assert '"songId": "lost-another-hour-to-the-bass"' in content
    assert '"text": "Found a white baggie..."' in content


def test_video_api_save_lyrics_rejects_source_path_outside_repo(tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)
    client = TestClient(create_video_app(cfg))

    response = client.post(
        "/api/video/save-lyrics",
        json={
            "songId": "lost-another-hour-to-the-bass",
            "lyricsSourceFile": "../outside.ts",
            "lyricsSourceExport": "lostAnotherHourLyrics",
            "lyrics": {
                "songId": "lost-another-hour-to-the-bass",
                "audioPath": "outputs/tracks/Lost Another Hour to the Bass.wav",
                "source": "manual-timing-pass",
                "lines": [],
            },
        },
    )

    assert response.status_code == 403
    assert (
        response.json()["detail"]
        == "Lyrics source file must live inside the repository root."
    )
