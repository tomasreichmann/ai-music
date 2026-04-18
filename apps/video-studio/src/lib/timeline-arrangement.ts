import { getBeatTime } from "./timing";
import type { AudioClipSpec, LoadedSongAnalysisArtifact, SceneSpec, SongComposition } from "./types";

export type TimelineWindow = {
  startSec: number;
  endSec: number;
};

const roundTime = (value: number): number => Number(value.toFixed(4));

const clipWindowFromDuration = (clip: AudioClipSpec, analysis?: { durationSec: number }): TimelineWindow => {
  const duration = clip.durationSec ?? (clip.kind === "song" && analysis ? analysis.durationSec : 0);
  return {
    startSec: roundTime(clip.startSec),
    endSec: roundTime(clip.endSec ?? clip.startSec + duration)
  };
};

export const getSongClip = (composition: SongComposition): AudioClipSpec | null =>
  composition.audioClips?.find((clip) => clip.kind === "song") ?? null;

export const getSongTimelineStartSec = (
  composition: SongComposition,
  analysis?: { durationSec: number }
): number => {
  const songClip = getSongClip(composition);
  if (songClip) {
    return clipWindowFromDuration(songClip, analysis).startSec;
  }

  return composition.bookends?.intro?.startSec ?? composition.bookends?.intro?.durationSec ?? 0;
};

export const getSongTimelineWindow = (
  composition: SongComposition,
  analysis: { durationSec: number }
): TimelineWindow => {
  const songClip = getSongClip(composition);
  if (songClip) {
    return clipWindowFromDuration(songClip, analysis);
  }

  const startSec = composition.bookends?.intro?.startSec ?? composition.bookends?.intro?.durationSec ?? 0;
  return {
    startSec: roundTime(startSec),
    endSec: roundTime(startSec + analysis.durationSec)
  };
};

export const getAudioClipWindow = (
  clip: AudioClipSpec,
  analysis?: { durationSec: number }
): TimelineWindow => clipWindowFromDuration(clip, analysis);

export const getBookendWindow = (
  composition: SongComposition,
  analysis: { durationSec: number },
  bookend: "intro" | "outro"
): TimelineWindow | null => {
  const entry = composition.bookends?.[bookend];
  if (!entry) {
    return null;
  }

  if (typeof entry.startSec === "number" && typeof entry.endSec === "number") {
    return {
      startSec: roundTime(entry.startSec),
      endSec: roundTime(entry.endSec)
    };
  }

  const songWindow = getSongTimelineWindow(composition, analysis);
  if (bookend === "intro") {
    return {
      startSec: 0,
      endSec: roundTime(entry.durationSec)
    };
  }

  return {
    startSec: roundTime(songWindow.endSec),
    endSec: roundTime(songWindow.endSec + entry.durationSec)
  };
};

export const getSceneWindow = (
  scene: SceneSpec,
  analysis: LoadedSongAnalysisArtifact,
  songStartSec: number
): TimelineWindow => ({
  startSec: roundTime(songStartSec + getBeatTime(analysis, scene.startBeat)),
  endSec: roundTime(songStartSec + getBeatTime(analysis, scene.endBeat))
});

export const getCompositionTimelineDurationSec = (
  composition: SongComposition,
  analysis: LoadedSongAnalysisArtifact
): number => {
  const songWindow = getSongTimelineWindow(composition, analysis);
  const windows: TimelineWindow[] = [songWindow];

  const introWindow = getBookendWindow(composition, analysis, "intro");
  const outroWindow = getBookendWindow(composition, analysis, "outro");
  if (introWindow) {
    windows.push(introWindow);
  }
  if (outroWindow) {
    windows.push(outroWindow);
  }

  for (const scene of composition.scenes) {
    windows.push(getSceneWindow(scene, analysis, songWindow.startSec));
  }

  for (const clip of composition.audioClips ?? []) {
    windows.push(getAudioClipWindow(clip, analysis));
  }

  return Math.max(analysis.durationSec, ...windows.map((window) => window.endSec));
};

export const getTimelineAudioClips = (
  composition: SongComposition,
  analysis: { durationSec: number }
): AudioClipSpec[] => {
  const songStartSec = getSongTimelineStartSec(composition, analysis);
  const fallbackSongClip: AudioClipSpec = {
    id: `${composition.songId}-song`,
    title: composition.title,
    kind: "song",
    audioFile: composition.audioFile,
    startSec: songStartSec,
    endSec: roundTime(songStartSec + analysis.durationSec),
    sourceStartSec: 0,
    sourceEndSec: roundTime(analysis.durationSec)
  };

  if (composition.audioClips?.length) {
    return composition.audioClips.some((clip) => clip.kind === "song")
      ? composition.audioClips
      : [fallbackSongClip, ...composition.audioClips];
  }

  return [fallbackSongClip];
};
