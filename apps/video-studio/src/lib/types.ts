import type { ComponentType } from "react";

export type BandName = "sub" | "bass" | "lowMid" | "mid" | "highMid" | "high";
export type EnvelopeChannel = BandName | "rms";

export interface BeatMarker {
  index: number;
  timeSec: number;
  bar: number;
  isDownbeat: boolean;
}

export interface EnvelopeDescriptor {
  format: "uint8-interleaved-v1";
  fps: number;
  frameCount: number;
  channels: EnvelopeChannel[];
  binaryPath: string;
  valueRange: [number, number];
}

export interface SongAnalysisArtifact {
  songId: string;
  audioPath: string;
  durationSec: number;
  bpm: number;
  beats: BeatMarker[];
  envelopes: EnvelopeDescriptor;
}

export interface LoadedSongAnalysisArtifact extends SongAnalysisArtifact {
  envelopeBytes: Uint8Array;
}

export type BindingSource = "sceneProgress" | "songProgress" | "beatPulse" | "loudness" | BandName;

export interface BindingSpec {
  source: BindingSource;
  inputRange?: [number, number];
  outputRange?: [number, number];
  clamp?: boolean;
}

export type EffectPresetKind =
  | "parallax"
  | "zoomPan"
  | "colorGrade"
  | "glowBloom"
  | "blurChromatic"
  | "particlesOverlay"
  | "visualEqBars"
  | "beatFlash";

export interface EffectPresetSpec {
  kind: EffectPresetKind;
  label?: string;
  params?: Record<string, number | string | boolean>;
  bindings?: Record<string, BindingSpec | BindingSpec[]>;
}

export interface LayerSpec {
  id: string;
  label: string;
  src: string;
  depth?: number;
  opacity?: number;
  blendMode?: React.CSSProperties["mixBlendMode"];
  objectPosition?: string;
  maskSrc?: string;
  maskMode?: "alpha" | "luminance";
  transformOrigin?: string;
  motion?: {
    translateX?: BindingSpec | BindingSpec[];
    translateY?: BindingSpec | BindingSpec[];
    rotate?: BindingSpec | BindingSpec[];
    scale?: BindingSpec | BindingSpec[];
    brightness?: BindingSpec | BindingSpec[];
    hueRotate?: BindingSpec | BindingSpec[];
  };
}

export interface LyricsOverlaySpec {
  className?: string;
  backdropClassName?: string;
}

export interface VisualSegmentSpec {
  id: string;
  title: string;
  prompt: string;
  layers: LayerSpec[];
  effects: EffectPresetSpec[];
  lyricsOverlay?: LyricsOverlaySpec;
  notes?: string;
  audioFile?: string;
  audioVolume?: number;
  transformOrigin?: string;
}

export interface SceneSpec extends VisualSegmentSpec {
  startBeat: number;
  endBeat: number;
  component?: SceneComponent;
}

export interface BookendSpec extends VisualSegmentSpec {
  durationSec: number;
  startSec?: number;
  endSec?: number;
  component?: BookendComponent;
}

export interface AudioClipSpec {
  id: string;
  title: string;
  kind: "song" | "track";
  audioFile: string;
  startSec: number;
  endSec?: number;
  durationSec?: number;
  sourceStartSec?: number;
  sourceEndSec?: number;
  audioVolume?: number;
  notes?: string;
}

export interface LyricWordCue {
  text: string;
  startSec?: number;
  endSec?: number;
  startBeat?: number;
  endBeat?: number;
}

export interface LyricLineCue {
  id: string;
  text: string;
  startSec?: number;
  endSec?: number;
  startBeat?: number;
  endBeat?: number;
  words?: LyricWordCue[];
}

export interface LyricsArtifact {
  songId: string;
  audioPath: string;
  source: string;
  referenceText?: string;
  lines: LyricLineCue[];
}

export interface SongComposition {
  songId: string;
  title: string;
  audioFile: string;
  audioClips?: AudioClipSpec[];
  analysisFile: string;
  lyricsFile?: string;
  lyricsSourceFile?: string;
  lyricsSourceExport?: string;
  lyrics?: LyricsArtifact;
  fps: number;
  width: number;
  height: number;
  bookends?: {
    intro?: BookendSpec;
    outro?: BookendSpec;
  };
  scenes: SceneSpec[];
}

export interface RuntimeBands {
  sub: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  high: number;
}

export interface RuntimeStateInput {
  sceneProgress: number;
  songProgress: number;
  beatPulse: number;
  loudness: number;
  bands: RuntimeBands;
}

export interface RuntimeState extends RuntimeStateInput {
  frame: number;
  videoDurationSec: number;
  currentBeat: number;
  currentTimeSec: number;
  songTimeSec: number | null;
  activeSegmentType: "intro" | "song" | "outro";
  activeBookend: BookendSpec | null;
  activeScene: SceneSpec | null;
  activeLyricLine: LyricLineCue | null;
  activeLyricWord: LyricWordCue | null;
}

export interface SceneRendererProps {
  scene: SceneSpec;
  song: SongComposition;
  analysis: LoadedSongAnalysisArtifact;
  runtime: RuntimeState;
  activeLyricLine: LyricLineCue | null;
  activeLyricWord: LyricWordCue | null;
  nextLyricLine: LyricLineCue | null;
}

export type SceneComponent = ComponentType<SceneRendererProps>;

export interface BookendRendererProps {
  bookend: BookendSpec;
  song: SongComposition;
  analysis: LoadedSongAnalysisArtifact;
  runtime: RuntimeState;
}

export type BookendComponent = ComponentType<BookendRendererProps>;
