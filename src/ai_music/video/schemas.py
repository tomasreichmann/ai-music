from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class BeatMarker(BaseModel):
    index: int = Field(ge=1)
    timeSec: float = Field(ge=0.0)
    bar: int = Field(ge=1)
    isDownbeat: bool


EnvelopeChannel = Literal["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"]


class EnvelopeDescriptor(BaseModel):
    format: Literal["uint8-interleaved-v1"] = "uint8-interleaved-v1"
    fps: int = Field(gt=0)
    frameCount: int = Field(gt=0)
    channels: list[EnvelopeChannel] = Field(
        default_factory=lambda: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"]
    )
    binaryPath: str = ""
    valueRange: tuple[int, int] = (0, 255)


class SongAnalysisArtifact(BaseModel):
    songId: str
    audioPath: str
    durationSec: float = Field(gt=0.0)
    bpm: float = Field(gt=0.0)
    beats: list[BeatMarker] = Field(default_factory=list)
    envelopes: EnvelopeDescriptor


class AnalyzeSongRequest(BaseModel):
    audioPath: str
    songId: str | None = None


class LyricWordCue(BaseModel):
    text: str
    startSec: float | None = Field(default=None, ge=0.0)
    endSec: float | None = Field(default=None, ge=0.0)
    startBeat: float | None = Field(default=None, ge=0.0)
    endBeat: float | None = Field(default=None, ge=0.0)


class LyricLineCue(BaseModel):
    id: str
    text: str
    startSec: float | None = Field(default=None, ge=0.0)
    endSec: float | None = Field(default=None, ge=0.0)
    startBeat: float | None = Field(default=None, ge=0.0)
    endBeat: float | None = Field(default=None, ge=0.0)
    words: list[LyricWordCue] = Field(default_factory=list)


class LyricsArtifact(BaseModel):
    songId: str
    audioPath: str
    source: str
    referenceText: str | None = None
    lines: list[LyricLineCue] = Field(default_factory=list)


class SaveLyricsRequest(BaseModel):
    songId: str
    lyricsSourceFile: str
    lyricsSourceExport: str
    lyrics: LyricsArtifact


class TranscribeLyricsRequest(BaseModel):
    audioPath: str
    songId: str | None = None
    referenceLyricsPath: str | None = None
    provider: str = "faster-whisper"
    model: str | None = None


class GeneratedImageAsset(BaseModel):
    provider: str
    model: str | None = None
    remoteUrl: str | None = None
    localPath: str | None = None
    revisedPrompt: str | None = None
    width: int | None = Field(default=None, ge=1)
    height: int | None = Field(default=None, ge=1)


class SceneImageArtifact(BaseModel):
    songId: str
    sceneId: str
    prompt: str
    negativePrompt: str | None = None
    image: GeneratedImageAsset
    provider: str


class GenerateSceneImageRequest(BaseModel):
    songId: str
    sceneId: str
    prompt: str
    negativePrompt: str | None = None
    width: int = Field(default=1280, ge=64)
    height: int = Field(default=720, ge=64)
    provider: str = "fal"
    model: str | None = None
