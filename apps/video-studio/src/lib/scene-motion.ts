export const deterministicJitter = (frame: number, seed: number): number => {
  const primary = Math.sin((frame + seed) * 0.61) * 0.68;
  const secondary = Math.sin((frame + seed * 3.1) * 0.17) * 0.32;

  return primary + secondary;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const ramp = (value: number, start: number, end: number): number => {
  if (end === start) {
    return value >= end ? 1 : 0;
  }

  return clamp01((value - start) / (end - start));
};

export const loopPulse = (timeSec: number, periodSec = 1): number => {
  if (periodSec <= 0) {
    return 0;
  }

  const phase = ((timeSec % periodSec) + periodSec) % periodSec;
  return 0.5 - 0.5 * Math.cos((phase / periodSec) * Math.PI * 2);
};
