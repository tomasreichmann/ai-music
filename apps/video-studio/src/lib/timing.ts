import type { SongAnalysisArtifact } from "./types";

export const beat = (index: number): number => Math.max(1, Math.round(index));

export const bar = (index: number): number => beat((Math.max(1, index) - 1) * 4 + 1);

export const bars = (startBar: number, endBarExclusive: number): { startBeat: number; endBeat: number } => ({
  startBeat: bar(startBar),
  endBeat: bar(endBarExclusive)
});

export const getBeatTime = (analysis: SongAnalysisArtifact, beatIndex: number): number => {
  if (!analysis.beats.length) {
    return 0;
  }

  const target = analysis.beats.find((entry) => entry.index === beatIndex);
  if (target) {
    return target.timeSec;
  }

  const firstBeat = analysis.beats[0];
  const secondBeat = analysis.beats[1];
  if (beatIndex <= firstBeat.index) {
    const beatDuration = secondBeat ? secondBeat.timeSec - firstBeat.timeSec : 60 / analysis.bpm;
    return Number((firstBeat.timeSec + (beatIndex - firstBeat.index) * beatDuration).toFixed(4));
  }

  for (let index = 0; index < analysis.beats.length - 1; index += 1) {
    const left = analysis.beats[index];
    const right = analysis.beats[index + 1];
    if (!left || !right) {
      continue;
    }
    if (beatIndex > left.index && beatIndex < right.index) {
      const progress = (beatIndex - left.index) / Math.max(right.index - left.index, 0.0001);
      return Number((left.timeSec + (right.timeSec - left.timeSec) * progress).toFixed(4));
    }
  }

  const lastBeat = analysis.beats.at(-1);
  const previousBeat = analysis.beats.at(-2);
  if (!lastBeat) {
    return 0;
  }

  const beatDuration = previousBeat ? lastBeat.timeSec - previousBeat.timeSec : 60 / analysis.bpm;
  return Number((lastBeat.timeSec + (beatIndex - lastBeat.index) * beatDuration).toFixed(4));
};

export const getBeatAtTime = (analysis: SongAnalysisArtifact, timeSec: number): number => {
  if (!analysis.beats.length) {
    return 1;
  }

  const firstBeat = analysis.beats[0];
  const secondBeat = analysis.beats[1];
  if (timeSec <= firstBeat.timeSec) {
    const beatDuration = secondBeat ? secondBeat.timeSec - firstBeat.timeSec : 60 / analysis.bpm;
    return Number((firstBeat.index + (timeSec - firstBeat.timeSec) / Math.max(beatDuration, 0.0001)).toFixed(4));
  }

  for (let index = 0; index < analysis.beats.length - 1; index += 1) {
    const left = analysis.beats[index];
    const right = analysis.beats[index + 1];
    if (!left || !right) {
      continue;
    }
    if (timeSec >= left.timeSec && timeSec <= right.timeSec) {
      const progress = (timeSec - left.timeSec) / Math.max(right.timeSec - left.timeSec, 0.0001);
      return Number((left.index + (right.index - left.index) * progress).toFixed(4));
    }
  }

  const lastBeat = analysis.beats.at(-1);
  const previousBeat = analysis.beats.at(-2);
  if (!lastBeat) {
    return 1;
  }

  const beatDuration = previousBeat ? lastBeat.timeSec - previousBeat.timeSec : 60 / analysis.bpm;
  return Number((lastBeat.index + (timeSec - lastBeat.timeSec) / Math.max(beatDuration, 0.0001)).toFixed(4));
};
