import analysis from "../data/demo-analysis.json";
import type { SongAnalysisArtifact } from "./types";
import { bar, bars, beat, getBeatTime } from "./timing";

const staggeredAnalysis: SongAnalysisArtifact = {
  songId: "staggered-demo",
  audioPath: "/audio/staggered-demo.wav",
  durationSec: 2,
  bpm: 100,
  beats: [
    { index: 1, timeSec: 0, bar: 1, isDownbeat: true },
    { index: 2, timeSec: 0.4, bar: 1, isDownbeat: false },
    { index: 3, timeSec: 1.1, bar: 1, isDownbeat: false },
    { index: 4, timeSec: 1.5, bar: 1, isDownbeat: false }
  ],
  envelopes: {
    format: "uint8-interleaved-v1",
    fps: 30,
    frameCount: 1,
    channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
    binaryPath: "/analysis/staggered-demo.envelopes.u8",
    valueRange: [0, 255]
  }
};

describe("timing helpers", () => {
  it("converts bars into beat indices", () => {
    expect(beat(12)).toBe(12);
    expect(bar(3)).toBe(9);
    expect(bars(2, 5)).toEqual({ startBeat: 5, endBeat: 17 });
  });

  it("resolves exact and extrapolated beat times", () => {
    expect(getBeatTime(analysis, 1)).toBeCloseTo(0, 4);
    expect(getBeatTime(analysis, 8)).toBeCloseTo(3.2813, 4);
    expect(getBeatTime(analysis, 20)).toBeCloseTo(8.9063, 3);
  });

  it("interpolates fractional beat times between beat markers", () => {
    expect(getBeatTime(staggeredAnalysis, 1.5)).toBeCloseTo(0.2, 4);
    expect(getBeatTime(staggeredAnalysis, 2.5)).toBeCloseTo(0.75, 4);
  });
});
