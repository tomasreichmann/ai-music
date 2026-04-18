from __future__ import annotations

from pathlib import Path
from typing import Any, Protocol

from ai_music.io.files import read_text
from ai_music.video.schemas import LyricLineCue, LyricsArtifact, LyricWordCue


class LyricsTranscriber(Protocol):
    provider_name: str

    def transcribe(
        self,
        *,
        song_id: str,
        audio_path: Path,
        reference_lyrics: str | None = None,
        model: str | None = None,
    ) -> LyricsArtifact | dict[str, Any]:
        ...


class FasterWhisperLyricsTranscriber:
    provider_name = "faster-whisper"

    def __init__(self, *, model_size: str = "small.en") -> None:
        self.model_size = model_size

    def transcribe(
        self,
        *,
        song_id: str,
        audio_path: Path,
        reference_lyrics: str | None = None,
        model: str | None = None,
    ) -> LyricsArtifact:
        try:
            from faster_whisper import WhisperModel
        except Exception as exc:  # pragma: no cover - depends on optional dependency
            raise RuntimeError(
                "Missing `faster-whisper`. Install it to enable lyric transcription."
            ) from exc

        whisper_model = WhisperModel(model or self.model_size, device="cpu", compute_type="int8")
        segments, _info = whisper_model.transcribe(
            str(audio_path),
            beam_size=5,
            language="en",
            condition_on_previous_text=False,
            word_timestamps=True,
            vad_filter=True,
        )

        lines: list[LyricLineCue] = []
        for index, segment in enumerate(list(segments), start=1):
            words: list[LyricWordCue] = []
            for word in segment.words or []:
                token = (word.word or "").strip()
                if not token:
                    continue
                words.append(
                    LyricWordCue(
                        text=token,
                        startSec=round(float(word.start or segment.start), 4),
                        endSec=round(float(word.end or segment.end), 4),
                    )
                )

            lines.append(
                LyricLineCue(
                    id=f"line-{index}",
                    text=(segment.text or "").strip(),
                    startSec=round(float(segment.start), 4),
                    endSec=round(float(segment.end), 4),
                    words=words,
                )
            )

        return LyricsArtifact(
            songId=song_id,
            audioPath=str(audio_path),
            source=self.provider_name,
            referenceText=reference_lyrics,
            lines=lines,
        )


def build_lyrics_transcriber(provider: str = "faster-whisper") -> LyricsTranscriber:
    normalized = provider.strip().lower()
    if normalized == "faster-whisper":
        return FasterWhisperLyricsTranscriber()
    raise ValueError(f"Unsupported lyrics provider `{provider}`.")


def load_reference_lyrics(path: Path | None) -> str | None:
    if path is None:
        return None
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Reference lyrics file `{resolved}` was not found.")
    return read_text(resolved).strip() or None
