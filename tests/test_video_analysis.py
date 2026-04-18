from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pytest
from ai_music.config import AppConfig, ProviderConfig
from ai_music.io.files import read_json
from ai_music.video.audio_analysis import decode_quantized_envelope_bytes, quantize_envelope_matrix
from ai_music.workflows.video_studio import analyze_song_audio, generate_scene_image
from scipy.io import wavfile


class _FakeImageProvider:
    provider_name = "fake-image"

    def generate_image(
        self,
        *,
        prompt: str,
        negative_prompt: str | None = None,
        width: int = 1280,
        height: int = 720,
        model: str | None = None,
    ):
        _ = (negative_prompt, width, height, model)
        return {
            "provider": self.provider_name,
            "model": "fake-model",
            "remote_url": "https://example.com/generated/test-scene.png",
            "revised_prompt": f"{prompt} cinematic still",
            "width": width,
            "height": height,
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


def _write_pulse_wav(
    path: Path,
    bpm: float = 120.0,
    duration_sec: float = 8.0,
    sr: int = 22050,
) -> None:
    total_samples = int(duration_sec * sr)
    timeline = np.arange(total_samples, dtype=np.float32) / sr
    waveform = np.zeros(total_samples, dtype=np.float32)
    beat_interval = 60.0 / bpm
    pulse_length = int(0.08 * sr)
    carrier = np.sin(2.0 * math.pi * 90.0 * np.arange(pulse_length, dtype=np.float32) / sr)
    envelope = np.linspace(1.0, 0.0, pulse_length, dtype=np.float32)
    pulse = 0.75 * carrier * envelope
    beat_count = int(duration_sec / beat_interval)
    for beat_index in range(beat_count):
        start = int(beat_index * beat_interval * sr)
        end = min(start + pulse_length, total_samples)
        waveform[start:end] += pulse[: end - start]
    waveform += 0.12 * np.sin(2.0 * math.pi * 220.0 * timeline)
    pcm = np.clip(waveform, -1.0, 1.0)
    wavfile.write(path, sr, (pcm * np.iinfo(np.int16).max).astype(np.int16))


def test_analyze_song_audio_writes_expected_artifact(tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)
    audio_path = tmp_path / "fixtures" / "pulse-song.wav"
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    _write_pulse_wav(audio_path)

    result = analyze_song_audio(cfg=cfg, audio_path=audio_path, song_id="pulse-song")

    artifact_path = cfg.root_dir / result["artifact_path"]
    envelope_path = cfg.root_dir / result["envelope_path"]
    assert artifact_path.exists()
    assert envelope_path.exists()

    payload = read_json(artifact_path)
    assert payload["songId"] == "pulse-song"
    assert payload["audioPath"].endswith("pulse-song.wav")
    assert payload["durationSec"] > 7.5
    assert payload["bpm"] == pytest.approx(120.0, abs=4.0)
    assert len(payload["beats"]) >= 12
    assert payload["beats"][0]["index"] == 1
    assert payload["beats"][0]["bar"] == 1
    assert payload["beats"][0]["isDownbeat"] is True
    assert "bands" not in payload
    assert "loudness" not in payload
    assert payload["envelopes"]["format"] == "uint8-interleaved-v1"
    assert payload["envelopes"]["fps"] == 60
    assert payload["envelopes"]["channels"] == [
        "sub",
        "bass",
        "lowMid",
        "mid",
        "highMid",
        "high",
        "rms",
    ]
    assert payload["envelopes"]["binaryPath"].endswith("pulse-song.envelopes.u8")
    assert payload["envelopes"]["valueRange"] == [0, 255]
    assert envelope_path.read_bytes()
    expected_size = payload["envelopes"]["frameCount"] * len(payload["envelopes"]["channels"])
    assert len(envelope_path.read_bytes()) == expected_size


def test_quantized_envelopes_roundtrip_with_uint8_tolerance() -> None:
    matrix = np.asarray(
        [
            [0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 0.125],
            [1.0, 0.8, 0.6, 0.4, 0.2, 0.0, 0.875],
        ],
        dtype=np.float32,
    )

    encoded = quantize_envelope_matrix(matrix)
    decoded = decode_quantized_envelope_bytes(
        encoded,
        frame_count=matrix.shape[0],
        channel_count=matrix.shape[1],
    )

    assert decoded.shape == matrix.shape
    assert np.max(np.abs(decoded - matrix)) <= (1.0 / 255.0) + 1e-6


def test_generate_scene_image_writes_metadata_manifest(tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)

    result = generate_scene_image(
        cfg=cfg,
        song_id="pulse-song",
        scene_id="intro",
        prompt="neon rain over a midnight freeway",
        provider=_FakeImageProvider(),
        negative_prompt="text watermark",
        width=1024,
        height=576,
    )

    metadata_path = cfg.root_dir / result["metadata_path"]
    assert metadata_path.exists()
    payload = read_json(metadata_path)
    assert payload["songId"] == "pulse-song"
    assert payload["sceneId"] == "intro"
    assert payload["provider"] == "fake-image"
    assert payload["image"]["remoteUrl"] == "https://example.com/generated/test-scene.png"
    assert payload["image"]["revisedPrompt"].endswith("cinematic still")
