import { getBeatTime } from "./timing";
import { sampleEnvelopeAtTime } from "./analysis";
import { getBookendWindow, getCompositionTimelineDurationSec, getSongTimelineWindow } from "./timeline-arrangement";
import type {
  LoadedSongAnalysisArtifact,
  LyricLineCue,
  LyricWordCue,
  RuntimeState,
  SceneSpec,
  SongComposition
} from "./types";

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const interpolate = (left: number, right: number, progress: number): number => left + (right - left) * progress;

const resolveCueWindow = (
  analysis: LoadedSongAnalysisArtifact,
  cue: Pick<LyricLineCue | LyricWordCue, "startSec" | "endSec" | "startBeat" | "endBeat">
): { startSec: number; endSec: number } | null => {
  if (typeof cue.startSec === "number" && typeof cue.endSec === "number") {
    return { startSec: cue.startSec, endSec: cue.endSec };
  }
  if (typeof cue.startBeat === "number" && typeof cue.endBeat === "number") {
    return {
      startSec: getBeatTime(analysis, cue.startBeat),
      endSec: getBeatTime(analysis, cue.endBeat)
    };
  }
  return null;
};

const expandLineWords = (analysis: LoadedSongAnalysisArtifact, line: LyricLineCue): LyricWordCue[] => {
  if (line.words?.length) {
    return line.words;
  }

  const cueWindow = resolveCueWindow(analysis, line);
  const tokens = line.text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!cueWindow || tokens.length === 0) {
    return [];
  }

  const span = Math.max(cueWindow.endSec - cueWindow.startSec, 0.001);
  return tokens.map((token, index) => {
    const startProgress = index / tokens.length;
    const endProgress = (index + 1) / tokens.length;
    return {
      text: token,
      startSec: cueWindow.startSec + span * startProgress,
      endSec: cueWindow.startSec + span * endProgress
    };
  });
};

const resolveActiveLyricLine = (
  analysis: LoadedSongAnalysisArtifact,
  composition: SongComposition,
  songTimeSec: number | null
): LyricLineCue | null => {
  if (songTimeSec == null || !composition.lyrics?.lines.length) {
    return null;
  }

  for (const line of composition.lyrics.lines) {
    const cueWindow = resolveCueWindow(analysis, line);
    if (!cueWindow) {
      continue;
    }
    if (songTimeSec >= cueWindow.startSec && songTimeSec < cueWindow.endSec) {
      return line;
    }
  }

  return null;
};

const resolveActiveLyricWord = (
  analysis: LoadedSongAnalysisArtifact,
  line: LyricLineCue | null,
  songTimeSec: number | null
): LyricWordCue | null => {
  if (!line || songTimeSec == null) {
    return null;
  }

  const words = expandLineWords(analysis, line);
  if (words.length === 0) {
    return null;
  }

  for (const word of words) {
    const cueWindow = resolveCueWindow(analysis, word);
    if (!cueWindow) {
      continue;
    }
    if (songTimeSec >= cueWindow.startSec && songTimeSec < cueWindow.endSec) {
      return word;
    }
  }

  const lineWindow = resolveCueWindow(analysis, line);
  if (!lineWindow) {
    return null;
  }
  const progress = clamp((songTimeSec - lineWindow.startSec) / Math.max(lineWindow.endSec - lineWindow.startSec, 0.001));
  return words[Math.min(words.length - 1, Math.floor(progress * words.length))] ?? words[0] ?? null;
};

const resolveCurrentBeat = (analysis: LoadedSongAnalysisArtifact, timeSec: number): number => {
  let currentBeat = 1;
  for (const marker of analysis.beats) {
    if (marker.timeSec <= timeSec) {
      currentBeat = marker.index;
    } else {
      break;
    }
  }
  return currentBeat;
};

const resolveBeatPulse = (analysis: LoadedSongAnalysisArtifact, timeSec: number): number => {
  const beatDuration = 60 / analysis.bpm;
  const nearestDistance = Math.min(
    ...analysis.beats.map((marker) => Math.abs(marker.timeSec - timeSec)),
    beatDuration
  );
  return clamp(1 - nearestDistance / (beatDuration * 0.5));
};

const resolveActiveScene = (scenes: SceneSpec[], currentBeat: number): SceneSpec | null =>
  scenes.find((scene) => currentBeat >= scene.startBeat && currentBeat < scene.endBeat) ?? scenes.at(-1) ?? null;

const resolveActiveSegmentType = (
  currentTimeSec: number,
  songWindow: { startSec: number; endSec: number }
): "intro" | "song" | "outro" => {
  if (currentTimeSec < songWindow.startSec) {
    return "intro";
  }
  if (currentTimeSec < songWindow.endSec) {
    return "song";
  }
  return "outro";
};

export const getVideoDurationSec = (
  analysis: LoadedSongAnalysisArtifact | { durationSec: number },
  composition: SongComposition
): number => {
  if ("beats" in analysis) {
    return getCompositionTimelineDurationSec(composition, analysis);
  }
  return analysis.durationSec;
};

const resolveActiveBookend = (
  composition: SongComposition,
  activeSegmentType: "intro" | "song" | "outro",
  currentTimeSec: number,
  analysis: LoadedSongAnalysisArtifact
): NonNullable<SongComposition["bookends"]>["intro"] | NonNullable<SongComposition["bookends"]>["outro"] | null => {
  if (activeSegmentType === "intro") {
    const intro = composition.bookends?.intro ?? null;
    const window = intro ? getBookendWindow(composition, { durationSec: analysis.durationSec }, "intro") : null;
    return window && currentTimeSec >= window.startSec && currentTimeSec < window.endSec ? intro : null;
  }
  if (activeSegmentType === "outro") {
    const outro = composition.bookends?.outro ?? null;
    const window = outro ? getBookendWindow(composition, { durationSec: analysis.durationSec }, "outro") : null;
    return window && currentTimeSec >= window.startSec && currentTimeSec < window.endSec ? outro : null;
  }
  return null;
};

export const getRuntimeState = ({
  analysis,
  composition,
  frame
}: {
  analysis: LoadedSongAnalysisArtifact;
  composition: SongComposition;
  frame: number;
}): RuntimeState => {
  const currentTimeSec = frame / composition.fps;
  const songWindow = getSongTimelineWindow(composition, analysis);
  const videoDurationSec = getVideoDurationSec(analysis, composition);
  const activeSegmentType = resolveActiveSegmentType(currentTimeSec, songWindow);
  const songTimeSec =
    activeSegmentType === "song" ? clamp(currentTimeSec - songWindow.startSec, 0, analysis.durationSec) : null;
  const timeForSignals =
    songTimeSec ??
    (activeSegmentType === "intro" ? 0 : Math.max(0, analysis.durationSec - 1 / composition.fps));
  const currentBeat = activeSegmentType === "intro" ? 0 : resolveCurrentBeat(analysis, timeForSignals);
  const activeScene = activeSegmentType === "song" ? resolveActiveScene(composition.scenes, currentBeat) : null;
  const activeBookend = resolveActiveBookend(composition, activeSegmentType, currentTimeSec, analysis);
  const sceneStart = activeScene ? getBeatTime(analysis, activeScene.startBeat) : 0;
  const sceneEnd = activeScene ? getBeatTime(analysis, activeScene.endBeat) : analysis.durationSec;
  const sceneProgress =
    activeScene && songTimeSec != null
      ? clamp((songTimeSec - sceneStart) / Math.max(sceneEnd - sceneStart, 0.001))
      : activeBookend && currentTimeSec >= 0
        ? clamp(
            (currentTimeSec -
              (activeSegmentType === "outro"
                ? songWindow.endSec
                : getBookendWindow(composition, { durationSec: analysis.durationSec }, "intro")?.startSec ?? 0)) /
              Math.max(activeBookend.durationSec, 0.001)
          )
        : 0;
  const songProgress =
    currentTimeSec < songWindow.startSec
      ? 0
      : currentTimeSec >= songWindow.endSec
        ? 1
        : clamp((songTimeSec ?? 0) / Math.max(analysis.durationSec, 0.001));
  const envelopeSample = sampleEnvelopeAtTime(analysis, timeForSignals, composition.fps);
  const activeLyricLine = resolveActiveLyricLine(analysis, composition, songTimeSec);
  const activeLyricWord = resolveActiveLyricWord(analysis, activeLyricLine, songTimeSec);

  return {
    frame,
    videoDurationSec,
    currentTimeSec,
    songTimeSec,
    currentBeat,
    activeSegmentType,
    activeBookend,
    activeScene,
    activeLyricLine,
    activeLyricWord,
    sceneProgress,
    songProgress,
    beatPulse: resolveBeatPulse(analysis, timeForSignals),
    loudness: envelopeSample.loudness,
    bands: envelopeSample.bands
  };
};
