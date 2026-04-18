from __future__ import annotations

import math
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import find_peaks, resample_poly

from ai_music.video.schemas import BeatMarker, EnvelopeDescriptor, SongAnalysisArtifact

_TARGET_SAMPLE_RATE = 22050
_FRAME_SIZE = 2048
_HOP_SIZE = 512
_ANALYSIS_FPS = 60
_ENVELOPE_CHANNELS = ("sub", "bass", "lowMid", "mid", "highMid", "high", "rms")
_BAND_RANGES = {
    "sub": (20.0, 60.0),
    "bass": (60.0, 250.0),
    "lowMid": (250.0, 500.0),
    "mid": (500.0, 2000.0),
    "highMid": (2000.0, 6000.0),
    "high": (6000.0, 12000.0),
}


@dataclass(slots=True)
class AudioAnalysisResult:
    artifact: SongAnalysisArtifact
    envelope_bytes: bytes


def _normalize_pcm(data: np.ndarray) -> np.ndarray:
    if data.ndim > 1:
        data = data.mean(axis=1)
    if np.issubdtype(data.dtype, np.integer):
        scale = float(max(abs(np.iinfo(data.dtype).min), np.iinfo(data.dtype).max))
        if scale <= 0:
            scale = 1.0
        return (data.astype(np.float32) / scale).clip(-1.0, 1.0)
    return data.astype(np.float32).clip(-1.0, 1.0)


def _decode_to_wav(path: Path, *, ffmpeg_path: str | None = None) -> Path:
    executable = ffmpeg_path or "ffmpeg"
    handle = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_path = Path(handle.name)
    handle.close()
    cmd = [
        executable,
        "-y",
        "-i",
        str(path),
        "-ac",
        "1",
        "-ar",
        str(_TARGET_SAMPLE_RATE),
        str(tmp_path),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except FileNotFoundError as exc:  # pragma: no cover - depends on local ffmpeg
        tmp_path.unlink(missing_ok=True)
        raise RuntimeError(
            f"Could not decode `{path}` because ffmpeg was not found. "
            "Configure FFMPEG_PATH or install ffmpeg."
        ) from exc
    except subprocess.CalledProcessError as exc:  # pragma: no cover
        tmp_path.unlink(missing_ok=True)
        stderr = exc.stderr.decode(errors="ignore")
        raise RuntimeError(f"ffmpeg failed while decoding `{path}`: {stderr}") from exc
    return tmp_path


def _load_audio_mono(path: Path, *, ffmpeg_path: str | None = None) -> tuple[np.ndarray, int]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Audio file `{resolved}` was not found.")

    decode_path = resolved
    cleanup_path: Path | None = None
    if resolved.suffix.lower() != ".wav":
        cleanup_path = _decode_to_wav(resolved, ffmpeg_path=ffmpeg_path)
        decode_path = cleanup_path

    try:
        sample_rate, data = wavfile.read(decode_path)
        samples = _normalize_pcm(np.asarray(data))
        if sample_rate != _TARGET_SAMPLE_RATE:
            samples = resample_poly(samples, _TARGET_SAMPLE_RATE, sample_rate).astype(np.float32)
            sample_rate = _TARGET_SAMPLE_RATE
        return samples, sample_rate
    finally:
        if cleanup_path is not None:
            cleanup_path.unlink(missing_ok=True)


def _frame_signal(
    samples: np.ndarray,
    *,
    frame_size: int = _FRAME_SIZE,
    hop_size: int = _HOP_SIZE,
) -> np.ndarray:
    if samples.size == 0:
        return np.zeros((0, frame_size), dtype=np.float32)
    if samples.size < frame_size:
        padded = np.pad(samples, (0, frame_size - samples.size))
        return padded.reshape(1, frame_size)

    frames: list[np.ndarray] = []
    for start in range(0, samples.size - frame_size + 1, hop_size):
        frames.append(samples[start : start + frame_size])
    final_start = (len(frames) - 1) * hop_size if frames else 0
    if final_start + frame_size < samples.size:
        tail = samples[-frame_size:]
        frames.append(tail)
    return np.stack(frames).astype(np.float32)


def _frame_times(frame_count: int, sample_rate: int, *, hop_size: int = _HOP_SIZE) -> np.ndarray:
    return (np.arange(frame_count, dtype=np.float32) * hop_size) / float(sample_rate)


def _normalize_series(values: np.ndarray) -> np.ndarray:
    if values.size == 0:
        return values.astype(np.float32)
    max_value = float(np.max(values))
    if max_value <= 1e-8:
        return np.zeros_like(values, dtype=np.float32)
    return (values / max_value).astype(np.float32)


def _estimate_beats(frame_times: np.ndarray, rms: np.ndarray) -> tuple[float, list[BeatMarker]]:
    if frame_times.size == 0 or rms.size == 0:
        bpm = 120.0
        return bpm, []

    onset = np.maximum(0.0, np.diff(rms, prepend=rms[0]))
    if onset.size == 0:
        onset = rms

    min_distance = max(1, int((60.0 / 180.0) / (_HOP_SIZE / _TARGET_SAMPLE_RATE)))
    prominence = max(0.03, float(np.max(onset)) * 0.2)
    peaks, _ = find_peaks(onset, distance=min_distance, prominence=prominence)

    if peaks.size >= 2:
        peak_times = frame_times[peaks]
        intervals = np.diff(peak_times)
        usable = intervals[(intervals > 0.25) & (intervals < 1.5)]
        beat_interval = float(np.median(usable if usable.size else intervals))
        if beat_interval <= 0:
            beat_interval = 0.5
        first_beat_time = float(peak_times[0])
    else:
        beat_interval = 0.5
        first_beat_time = 0.0

    bpm = 60.0 / beat_interval
    while bpm < 80.0:
        bpm *= 2.0
        beat_interval /= 2.0
    while bpm > 180.0:
        bpm /= 2.0
        beat_interval *= 2.0

    duration_sec = float(frame_times[-1]) + (_FRAME_SIZE / _TARGET_SAMPLE_RATE)
    beat_times = np.arange(
        first_beat_time,
        duration_sec + beat_interval,
        beat_interval,
        dtype=np.float32,
    )
    beats = [
        BeatMarker(
            index=index + 1,
            timeSec=round(float(time_sec), 4),
            bar=(index // 4) + 1,
            isDownbeat=index % 4 == 0,
        )
        for index, time_sec in enumerate(beat_times)
    ]
    return round(float(bpm), 2), beats


def _resample_envelope_matrix(
    frame_times: np.ndarray,
    channel_series: list[np.ndarray],
    *,
    duration_sec: float,
    fps: int = _ANALYSIS_FPS,
) -> np.ndarray:
    frame_count = max(1, int(math.ceil(duration_sec * fps)))
    target_times = np.arange(frame_count, dtype=np.float32) / float(fps)
    resampled: list[np.ndarray] = []

    for values in channel_series:
        series = np.asarray(values, dtype=np.float32)
        if series.size == 0:
            resampled.append(np.zeros(frame_count, dtype=np.float32))
            continue
        resampled.append(
            np.interp(
                target_times,
                frame_times,
                series,
                left=float(series[0]),
                right=float(series[-1]),
            ).astype(np.float32)
        )

    return np.stack(resampled, axis=1).astype(np.float32)


def quantize_envelope_matrix(matrix: np.ndarray) -> bytes:
    clipped = np.clip(np.asarray(matrix, dtype=np.float32), 0.0, 1.0)
    return np.rint(clipped * 255.0).astype(np.uint8).tobytes(order="C")


def decode_quantized_envelope_bytes(
    payload: bytes,
    *,
    frame_count: int,
    channel_count: int,
) -> np.ndarray:
    raw = np.frombuffer(payload, dtype=np.uint8)
    expected_size = frame_count * channel_count
    if raw.size != expected_size:
        raise ValueError(
            f"Envelope payload size mismatch. Expected {expected_size} bytes, got {raw.size}."
        )
    return (raw.reshape(frame_count, channel_count).astype(np.float32)) / 255.0


def analyze_audio_file(
    song_id: str,
    audio_path: Path,
    *,
    ffmpeg_path: str | None = None,
) -> AudioAnalysisResult:
    samples, sample_rate = _load_audio_mono(audio_path, ffmpeg_path=ffmpeg_path)
    frames = _frame_signal(samples)
    times = _frame_times(frames.shape[0], sample_rate)

    rms = np.sqrt(np.mean(np.square(frames), axis=1, dtype=np.float32))
    normalized_rms = _normalize_series(rms)

    window = np.hanning(_FRAME_SIZE).astype(np.float32)
    spectral = np.abs(np.fft.rfft(frames * window, axis=1))
    freqs = np.fft.rfftfreq(_FRAME_SIZE, d=1.0 / sample_rate)

    band_series: dict[str, np.ndarray] = {}
    for name, (low, high) in _BAND_RANGES.items():
        mask = (freqs >= low) & (freqs < min(high, sample_rate / 2.0))
        if not np.any(mask):
            band_series[name] = np.zeros(frames.shape[0], dtype=np.float32)
            continue
        power = np.mean(np.square(spectral[:, mask]), axis=1)
        band_series[name] = _normalize_series(power)

    bpm, beats = _estimate_beats(times, normalized_rms)

    duration_sec = round(float(samples.size) / float(sample_rate), 4)
    if not math.isfinite(duration_sec) or duration_sec <= 0:
        raise ValueError(f"Audio file `{audio_path}` did not produce a valid duration.")

    envelope_matrix = _resample_envelope_matrix(
        times,
        [band_series[name] for name in _ENVELOPE_CHANNELS[:-1]] + [normalized_rms],
        duration_sec=duration_sec,
        fps=_ANALYSIS_FPS,
    )
    envelope_bytes = quantize_envelope_matrix(envelope_matrix)

    return AudioAnalysisResult(
        artifact=SongAnalysisArtifact(
            songId=song_id,
            audioPath=str(audio_path.resolve()),
            durationSec=duration_sec,
            bpm=bpm,
            beats=beats,
            envelopes=EnvelopeDescriptor(
                fps=_ANALYSIS_FPS,
                frameCount=envelope_matrix.shape[0],
                channels=list(_ENVELOPE_CHANNELS),
            ),
        ),
        envelope_bytes=envelope_bytes,
    )
