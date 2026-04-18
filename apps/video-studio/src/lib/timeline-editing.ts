import { getBookendWindow, getSongTimelineWindow } from "./timeline-arrangement";
import type { AudioClipSpec, LyricsArtifact, LyricLineCue, SceneSpec, SongComposition } from "./types";

export type TimelineEdge = "start" | "end";

export type TimelineEditOptions = {
  shiftKey?: boolean;
  snapEnabled?: boolean;
  snapInterval?: number;
};

const DEFAULT_SNAP_INTERVAL = 0.25;
const MIN_BEAT_SPAN = 0.01;

const roundBeat = (value: number): number => Number(value.toFixed(4));

const snapBeat = (value: number, enabled = true, interval = DEFAULT_SNAP_INTERVAL): number => {
  if (!enabled) {
    return roundBeat(value);
  }
  return roundBeat(Math.round(value / interval) * interval);
};

const clampBeat = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const clampTime = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const shiftWord = (word: NonNullable<LyricLineCue["words"]>[number], delta: number) => ({
  ...word,
  startBeat: typeof word.startBeat === "number" ? roundBeat(word.startBeat + delta) : word.startBeat,
  endBeat: typeof word.endBeat === "number" ? roundBeat(word.endBeat + delta) : word.endBeat
});

const stretchWord = (
  word: NonNullable<LyricLineCue["words"]>[number],
  originBeat: number,
  currentSpan: number,
  nextSpan: number
) => {
  const currentStart = typeof word.startBeat === "number" ? word.startBeat : originBeat;
  const currentEnd = typeof word.endBeat === "number" ? word.endBeat : currentStart;
  const startOffset = currentStart - originBeat;
  const endOffset = currentEnd - originBeat;

  return {
    ...word,
    startBeat: roundBeat(originBeat + (startOffset / currentSpan) * nextSpan),
    endBeat: roundBeat(originBeat + (endOffset / currentSpan) * nextSpan)
  };
};

const cloneLyrics = (lyrics: LyricsArtifact): LyricsArtifact => ({
  ...lyrics,
  lines: lyrics.lines.map((entry) => ({
    ...entry,
    words: entry.words?.map((word) => ({ ...word }))
  }))
});

const shiftLine = (line: LyricLineCue, delta: number): LyricLineCue => {
  const shifted = {
    ...line,
    startBeat: typeof line.startBeat === "number" ? roundBeat(line.startBeat + delta) : line.startBeat,
    endBeat: typeof line.endBeat === "number" ? roundBeat(line.endBeat + delta) : line.endBeat,
    words: line.words?.map((word) => shiftWord(word, delta))
  };

  return syncLineWindow(shifted);
};

const setLineStart = (line: LyricLineCue, target: number): LyricLineCue => {
  if (line.words?.length) {
    const currentStart = line.words[0]?.startBeat ?? line.startBeat ?? target;
    const delta = target - currentStart;
    line.words = line.words.map((word) => shiftWord(word, delta));
  } else {
    line.startBeat = target;
  }

  return syncLineWindow(line);
};

const setLineEnd = (line: LyricLineCue, target: number): LyricLineCue => {
  if (line.words?.length) {
    const lastIndex = line.words.length - 1;
    line.words[lastIndex] = {
      ...line.words[lastIndex],
      endBeat: target
    };
  } else {
    line.endBeat = target;
  }

  return syncLineWindow(line);
};

const stretchLineEnd = (line: LyricLineCue, target: number): LyricLineCue => {
  if (!line.words?.length) {
    return {
      ...line,
      endBeat: target
    };
  }

  const firstWord = line.words[0];
  const lastWord = line.words.at(-1);
  const originBeat = typeof firstWord?.startBeat === "number" ? firstWord.startBeat : line.startBeat ?? 0;
  const currentEnd = typeof lastWord?.endBeat === "number" ? lastWord.endBeat : line.endBeat ?? originBeat;
  const currentSpan = Math.max(currentEnd - originBeat, MIN_BEAT_SPAN);
  const nextEnd = Math.max(target, originBeat + MIN_BEAT_SPAN);
  const nextSpan = Math.max(nextEnd - originBeat, MIN_BEAT_SPAN);

  const stretched = {
    ...line,
    words: line.words.map((word) => stretchWord(word, originBeat, currentSpan, nextSpan))
  };

  if (stretched.words.length > 0) {
    stretched.words[0] = {
      ...stretched.words[0],
      startBeat: roundBeat(originBeat)
    };
    const lastIndex = stretched.words.length - 1;
    stretched.words[lastIndex] = {
      ...stretched.words[lastIndex],
      endBeat: roundBeat(nextEnd)
    };
  }

  return syncLineWindow(stretched);
};

const syncLineWindow = (line: LyricLineCue): LyricLineCue => {
  if (!line.words?.length) {
    return line;
  }

  const firstWord = line.words[0];
  const lastWord = line.words.at(-1);
  if (typeof firstWord?.startBeat !== "number" || typeof lastWord?.endBeat !== "number") {
    return line;
  }

  return {
    ...line,
    startBeat: roundBeat(firstWord.startBeat),
    endBeat: roundBeat(lastWord.endBeat)
  };
};

export const getLyricLineWindow = (
  line: LyricLineCue
): { startBeat: number; endBeat: number } | null => {
  if (line.words?.length) {
    const firstWord = line.words[0];
    const lastWord = line.words.at(-1);
    if (typeof firstWord?.startBeat === "number" && typeof lastWord?.endBeat === "number") {
      return { startBeat: roundBeat(firstWord.startBeat), endBeat: roundBeat(lastWord.endBeat) };
    }
  }

  if (typeof line.startBeat === "number" && typeof line.endBeat === "number") {
    return { startBeat: roundBeat(line.startBeat), endBeat: roundBeat(line.endBeat) };
  }

  return null;
};

export const adjustSceneBoundary = (
  scenes: SceneSpec[],
  sceneIndex: number,
  edge: TimelineEdge,
  beat: number,
  options: TimelineEditOptions = {}
): SceneSpec[] => {
  const scene = scenes[sceneIndex];
  if (!scene) {
    return scenes;
  }

  const snapEnabled = options.snapEnabled ?? true;
  const snapInterval = options.snapInterval ?? DEFAULT_SNAP_INTERVAL;
  const nextBeat = snapBeat(beat, snapEnabled, snapInterval);
  const shiftKey = options.shiftKey ?? false;
  const nextScenes = scenes.map((entry) => ({ ...entry }));
  const current = nextScenes[sceneIndex];
  const previous = nextScenes[sceneIndex - 1];
  const next = nextScenes[sceneIndex + 1];

  if (edge === "start") {
    const lowerBound = previous ? (previous.startBeat ?? 0) + MIN_BEAT_SPAN : Number.NEGATIVE_INFINITY;
    const upperBound = (current.endBeat ?? nextBeat) - MIN_BEAT_SPAN;
    const target = clampBeat(nextBeat, lowerBound, upperBound);

    if (shiftKey) {
      const delta = nextBeat - current.startBeat;
      if (previous) {
        previous.endBeat = nextBeat;
      }
      for (let index = sceneIndex; index < nextScenes.length; index += 1) {
        nextScenes[index] = {
          ...nextScenes[index],
          startBeat: roundBeat(nextScenes[index].startBeat + delta),
          endBeat: roundBeat(nextScenes[index].endBeat + delta)
        };
      }
      return nextScenes;
    }

    current.startBeat = target;
    return nextScenes;
  }

  const lowerBound = (current.startBeat ?? nextBeat) + MIN_BEAT_SPAN;
  const upperBound = next ? (next.endBeat ?? nextBeat) - MIN_BEAT_SPAN : Number.POSITIVE_INFINITY;
  const target = clampBeat(nextBeat, lowerBound, upperBound);

  if (shiftKey) {
    const boundary = nextBeat;
    const delta = boundary - current.endBeat;
    current.endBeat = boundary;
    for (let index = sceneIndex + 1; index < nextScenes.length; index += 1) {
      nextScenes[index] = {
        ...nextScenes[index],
        startBeat: roundBeat(nextScenes[index].startBeat + delta),
        endBeat: roundBeat(nextScenes[index].endBeat + delta)
      };
    }
    return nextScenes;
  }

  current.endBeat = target;
  if (next) {
    next.startBeat = target;
  }
  return nextScenes;
};

export const adjustLyricWordBoundary = (
  lyrics: LyricsArtifact,
  lineId: string,
  wordIndex: number,
  edge: TimelineEdge,
  beat: number,
  options: TimelineEditOptions = {}
): LyricsArtifact => {
  const line = lyrics.lines.find((entry) => entry.id === lineId);
  if (!line?.words?.length) {
    return lyrics;
  }

  const lineIndex = lyrics.lines.findIndex((entry) => entry.id === lineId);
  if (lineIndex < 0) {
    return lyrics;
  }

  const snapEnabled = options.snapEnabled ?? true;
  const snapInterval = options.snapInterval ?? DEFAULT_SNAP_INTERVAL;
  const shiftKey = options.shiftKey ?? false;
  const target = snapBeat(beat, snapEnabled, snapInterval);
  const nextLyrics = {
    ...lyrics,
    lines: lyrics.lines.map((entry) => ({ ...entry, words: entry.words?.map((word) => ({ ...word })) }))
  };
  const nextLine = nextLyrics.lines[lineIndex];
  const words = nextLine.words;
  if (!words?.length) {
    return lyrics;
  }
  const current = words[wordIndex];
  if (!current) {
    return lyrics;
  }

  const minSpan = snapEnabled ? snapInterval : MIN_BEAT_SPAN;

  if (edge === "start") {
    if (shiftKey) {
      const delta = target - (current.startBeat ?? target);
      if (wordIndex > 0) {
        const previous = words[wordIndex - 1];
        previous.endBeat = target;
      }
      for (let index = wordIndex; index < words.length; index += 1) {
        words[index] = shiftWord(words[index], delta);
      }
    } else if (wordIndex > 0) {
      const previous = words[wordIndex - 1];
      const lowerBound = (previous.startBeat ?? target) + minSpan;
      const upperBound = (current.endBeat ?? target) - minSpan;
      const boundary = clampBeat(target, lowerBound, upperBound);
      previous.endBeat = boundary;
      current.startBeat = boundary;
    } else {
      const upperBound = (current.endBeat ?? target) - minSpan;
      current.startBeat = clampBeat(target, Number.NEGATIVE_INFINITY, upperBound);
      if (typeof current.endBeat !== "number" || current.endBeat - current.startBeat < minSpan) {
        current.endBeat = roundBeat(current.startBeat + minSpan);
      }
    }
  } else if (shiftKey) {
    const delta = target - (current.endBeat ?? target);
    current.endBeat = target;
    for (let index = wordIndex + 1; index < words.length; index += 1) {
      words[index] = shiftWord(words[index], delta);
    }
  } else if (wordIndex < words.length - 1) {
    const next = words[wordIndex + 1];
    const lowerBound = (current.startBeat ?? target) + minSpan;
    const upperBound = (next.endBeat ?? target) - minSpan;
    const boundary = clampBeat(target, lowerBound, upperBound);
    current.endBeat = boundary;
    next.startBeat = boundary;
  } else {
    const lowerBound = (current.startBeat ?? target) + minSpan;
    current.endBeat = Math.max(target, lowerBound);
  }

  nextLyrics.lines[lineIndex] = syncLineWindow(nextLine);
  return nextLyrics;
};

export const adjustLyricLineBoundary = (
  lyrics: LyricsArtifact,
  lineId: string,
  edge: TimelineEdge,
  beat: number,
  options: TimelineEditOptions = {}
): LyricsArtifact => {
  const lineIndex = lyrics.lines.findIndex((entry) => entry.id === lineId);
  if (lineIndex < 0) {
    return lyrics;
  }

  const snapEnabled = options.snapEnabled ?? true;
  const snapInterval = options.snapInterval ?? DEFAULT_SNAP_INTERVAL;
  const shiftKey = options.shiftKey ?? false;
  const nextLyrics = cloneLyrics(lyrics);
  const current = nextLyrics.lines[lineIndex];
  const currentFirstWord = current.words?.[0];
  const currentLastWord = current.words?.at(-1);
  const currentStart = currentFirstWord?.startBeat ?? current.startBeat ?? 0;
  const currentEnd = currentLastWord?.endBeat ?? current.endBeat ?? currentStart;
  const target = snapBeat(beat, snapEnabled, snapInterval);
  const previous = nextLyrics.lines[lineIndex - 1];
  const next = nextLyrics.lines[lineIndex + 1];

  if (edge === "start") {
    const previousLastWordStart = previous?.words?.at(-1)?.startBeat ?? previous?.startBeat ?? 0;
    const nextFirstWordStart = next?.words?.[0]?.startBeat ?? next?.startBeat ?? Number.POSITIVE_INFINITY;
    const lowerBound = previous ? previousLastWordStart + MIN_BEAT_SPAN : Number.NEGATIVE_INFINITY;
    const upperBound = next ? nextFirstWordStart - MIN_BEAT_SPAN : Number.POSITIVE_INFINITY;
    const boundary = clampBeat(target, lowerBound, upperBound);

    if (shiftKey) {
      const shiftedTarget = snapBeat(beat, snapEnabled, snapInterval);
      const delta = shiftedTarget - currentStart;
      for (let index = lineIndex; index < nextLyrics.lines.length; index += 1) {
        nextLyrics.lines[index] = shiftLine(nextLyrics.lines[index], delta);
      }
      return nextLyrics;
    }

    if (previous) {
      nextLyrics.lines[lineIndex - 1] = setLineEnd(previous, boundary);
    }
    nextLyrics.lines[lineIndex] = setLineStart(current, boundary);
    return nextLyrics;
  }

  const lowerBound = currentStart + MIN_BEAT_SPAN;
  const nextFirstWordStart = next?.words?.[0]?.startBeat ?? next?.startBeat ?? Number.POSITIVE_INFINITY;
  const upperBound = next ? Math.max(nextFirstWordStart - MIN_BEAT_SPAN, lowerBound) : Number.POSITIVE_INFINITY;
  const boundary = clampBeat(target, lowerBound, upperBound);

  if (shiftKey) {
    const shiftedTarget = snapBeat(beat, snapEnabled, snapInterval);
    const delta = shiftedTarget - currentEnd;
    nextLyrics.lines[lineIndex] = setLineEnd(current, shiftedTarget);
    for (let index = lineIndex + 1; index < nextLyrics.lines.length; index += 1) {
      nextLyrics.lines[index] = shiftLine(nextLyrics.lines[index], delta);
    }
    return nextLyrics;
  }

  nextLyrics.lines[lineIndex] = stretchLineEnd(current, boundary);
  return nextLyrics;
};

export const adjustAudioClipBoundary = (
  clip: AudioClipSpec,
  edge: TimelineEdge,
  timeSec: number,
  options: TimelineEditOptions = {}
): AudioClipSpec => {
  const snapEnabled = options.snapEnabled ?? true;
  const snapInterval = options.snapInterval ?? 0.25;
  const nextTime = snapBeat(timeSec, snapEnabled, snapInterval);
  const shiftKey = options.shiftKey ?? false;
  const nextClip = { ...clip };
  const currentStart = clip.startSec;
  const currentEnd = clip.endSec ?? clip.startSec + (clip.durationSec ?? 0);
  const minSpan = snapEnabled ? snapInterval : MIN_BEAT_SPAN;

  if (edge === "start") {
    if (shiftKey) {
      const delta = nextTime - currentStart;
      nextClip.startSec = roundBeat(currentStart + delta);
      nextClip.endSec = roundBeat(currentEnd + delta);
      return nextClip;
    }

    const newStart = clampTime(nextTime, 0, currentEnd - minSpan);
    const delta = newStart - currentStart;
    nextClip.startSec = roundBeat(newStart);
    nextClip.sourceStartSec = roundBeat((clip.sourceStartSec ?? 0) + delta);
    nextClip.endSec = roundBeat(currentEnd);
    nextClip.sourceEndSec = roundBeat(clip.sourceEndSec ?? currentEnd);
    return nextClip;
  }

  if (shiftKey) {
    const delta = nextTime - currentEnd;
    nextClip.startSec = roundBeat(currentStart + delta);
    nextClip.endSec = roundBeat(currentEnd + delta);
    return nextClip;
  }

  const newEnd = Math.max(nextTime, currentStart + minSpan);
  const delta = newEnd - currentEnd;
  nextClip.startSec = roundBeat(currentStart);
  nextClip.endSec = roundBeat(newEnd);
  nextClip.sourceStartSec = roundBeat(clip.sourceStartSec ?? 0);
  nextClip.sourceEndSec = roundBeat((clip.sourceEndSec ?? currentEnd) + delta);
  return nextClip;
};

export const adjustBookendBoundary = (
  composition: SongComposition,
  analysis: { durationSec: number },
  bookend: "intro" | "outro",
  edge: TimelineEdge,
  timeSec: number,
  options: TimelineEditOptions = {}
): SongComposition => {
  const snapEnabled = options.snapEnabled ?? true;
  const snapInterval = options.snapInterval ?? 0.25;
  const nextTime = snapBeat(timeSec, snapEnabled, snapInterval);
  const shiftKey = options.shiftKey ?? false;
  const currentWindow = getBookendWindow(composition, analysis, bookend);
  const songWindow = getSongTimelineWindow(composition, analysis);
  const fallbackWindow =
    bookend === "intro"
      ? { startSec: 0, endSec: composition.bookends?.intro?.durationSec ?? 0 }
      : {
          startSec: songWindow.endSec,
          endSec: songWindow.endSec + (composition.bookends?.outro?.durationSec ?? 0)
        };
  const window = currentWindow ?? fallbackWindow;
  const minSpan = snapEnabled ? snapInterval : MIN_BEAT_SPAN;
  const nextComposition: SongComposition = {
    ...composition,
    bookends: {
      ...composition.bookends
    }
  };
  const current = nextComposition.bookends?.[bookend];
  if (!current) {
    return composition;
  }

  if (edge === "start") {
    if (shiftKey) {
      const delta = nextTime - window.startSec;
      nextComposition.bookends = {
        ...nextComposition.bookends,
        [bookend]: {
          ...current,
          startSec: roundBeat(window.startSec + delta),
          endSec: roundBeat(window.endSec + delta),
          durationSec: roundBeat(window.endSec - window.startSec)
        }
      };
      return nextComposition;
    }

    const newStart = clampTime(nextTime, 0, window.endSec - minSpan);
    nextComposition.bookends = {
      ...nextComposition.bookends,
      [bookend]: {
        ...current,
        startSec: roundBeat(newStart),
        endSec: roundBeat(window.endSec),
        durationSec: roundBeat(window.endSec - newStart)
      }
    };
    return nextComposition;
  }

  if (shiftKey) {
    const delta = nextTime - window.endSec;
    nextComposition.bookends = {
      ...nextComposition.bookends,
      [bookend]: {
        ...current,
        startSec: roundBeat(window.startSec + delta),
        endSec: roundBeat(window.endSec + delta),
        durationSec: roundBeat(window.endSec - window.startSec)
      }
    };
    return nextComposition;
  }

  const newEnd = Math.max(nextTime, window.startSec + minSpan);
  nextComposition.bookends = {
    ...nextComposition.bookends,
    [bookend]: {
      ...current,
      startSec: roundBeat(window.startSec),
      endSec: roundBeat(newEnd),
      durationSec: roundBeat(newEnd - window.startSec)
    }
  };
  return nextComposition;
};

export const adjustBookendDuration = (
  composition: SongComposition,
  analysisDurationSec: number,
  bookend: "intro" | "outro",
  timeSec: number,
  options: TimelineEditOptions = {}
): SongComposition =>
  adjustBookendBoundary(composition, { durationSec: analysisDurationSec }, bookend, "end", timeSec, options);
