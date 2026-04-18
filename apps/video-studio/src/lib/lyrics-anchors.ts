import type { LyricLineCue, LyricWordCue } from "./types";

export interface LineAnchorInput {
  text: string;
  beats: number;
  startBeat?: number;
  endBeat?: number;
  gapAfter?: number;
  wordWeights?: number[];
}

const roundBeat = (value: number): number => Number(value.toFixed(3));

const tokenize = (text: string): string[] =>
  text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const estimateWordWeight = (token: string, index: number, total: number): number => {
  const bare = token.replace(/[^\w']/g, "");
  let weight = Math.max(0.55, bare.length * 0.15);

  if (/^\(.+\)\.*$/i.test(token)) {
    weight += 0.35;
  }
  if (/[,;:]/.test(token)) {
    weight += 0.08;
  }
  if (/[.!?]+$/.test(token)) {
    weight += 0.18;
  }
  if (index === total - 1) {
    weight += 0.26;
  }
  if (bare.length <= 2) {
    weight -= 0.06;
  }

  return roundBeat(Math.max(weight, 0.35));
};

export const buildWordCues = (
  text: string,
  startBeat: number,
  endBeat: number,
  wordWeights?: number[]
): LyricWordCue[] => {
  const tokens = tokenize(text);
  if (!tokens.length) {
    return [];
  }

  const span = Math.max(endBeat - startBeat, 0.25);
  const weights = tokens.map((token, index) => wordWeights?.[index] ?? estimateWordWeight(token, index, tokens.length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = startBeat;

  return tokens.map((token, index) => {
    const nextCursor =
      index === tokens.length - 1
        ? endBeat
        : cursor + span * ((weights[index] ?? 1) / Math.max(totalWeight, 0.0001));
    const cue = {
      text: token,
      startBeat: roundBeat(cursor),
      endBeat: roundBeat(nextCursor)
    };
    cursor = nextCursor;
    return cue;
  });
};

export const anchorSection = (prefix: string, startBeat: number, lines: LineAnchorInput[]): LyricLineCue[] => {
  let cursor = startBeat;

  return lines.map((entry, index) => {
    const lineStart = roundBeat(entry.startBeat ?? cursor);
    const lineEnd = roundBeat(entry.endBeat ?? lineStart + entry.beats);
    cursor = roundBeat(lineEnd + (entry.gapAfter ?? 0));

    return {
      id: `${prefix}-${index + 1}`,
      text: entry.text,
      startBeat: lineStart,
      endBeat: lineEnd,
      words: buildWordCues(entry.text, lineStart, lineEnd, entry.wordWeights)
    };
  });
};

export const line = (text: string, beats: number, wordWeights?: number[]): LineAnchorInput => ({
  text,
  beats,
  wordWeights
});
