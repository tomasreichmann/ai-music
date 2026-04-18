from __future__ import annotations

from pathlib import Path

from ai_music.config import AppConfig, ProviderConfig
from ai_music.io.files import read_json
from ai_music.workflows.video_studio import transcribe_song_lyrics


class _FakeLyricsTranscriber:
    provider_name = "fake-transcriber"

    def transcribe(
        self,
        *,
        song_id: str,
        audio_path: Path,
        reference_lyrics: str | None = None,
        model: str | None = None,
    ):
        _ = (audio_path, model)
        return {
            "songId": song_id,
            "audioPath": str(audio_path),
            "source": "fake-transcriber",
            "referenceText": reference_lyrics,
            "lines": [
                {
                    "id": "line-1",
                    "text": "Lost another hour to the bass",
                    "startSec": 12.0,
                    "endSec": 14.0,
                    "words": [
                        {"text": "Lost", "startSec": 12.0, "endSec": 12.4},
                        {"text": "another", "startSec": 12.4, "endSec": 12.9},
                    ],
                }
            ],
        }


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


def test_transcribe_song_lyrics_writes_artifact(tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)
    audio_path = tmp_path / "tracks" / "test-song.wav"
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    audio_path.write_bytes(b"placeholder-audio")
    reference_path = tmp_path / "lyrics.txt"
    reference_path.write_text("Lost another hour to the bass", encoding="utf-8")

    result = transcribe_song_lyrics(
        cfg=cfg,
        audio_path=audio_path,
        song_id="test-song",
        reference_lyrics_path=reference_path,
        transcriber=_FakeLyricsTranscriber(),
    )

    artifact_path = cfg.root_dir / result["artifact_path"]
    assert artifact_path.exists()
    payload = read_json(artifact_path)
    assert payload["songId"] == "test-song"
    assert payload["source"] == "fake-transcriber"
    assert payload["referenceText"] == "Lost another hour to the bass"
    assert payload["lines"][0]["words"][0]["text"] == "Lost"
