import { hydrateAnalysisArtifact, sampleEnvelopeAtTime } from "./analysis";
import type { SongAnalysisArtifact } from "./types";

const metadata: SongAnalysisArtifact = {
  songId: "fixture-song",
  audioPath: "/audio/fixture.wav",
  durationSec: 1,
  bpm: 120,
  beats: [
    { index: 1, timeSec: 0, bar: 1, isDownbeat: true },
    { index: 2, timeSec: 0.5, bar: 1, isDownbeat: false }
  ],
  envelopes: {
    format: "uint8-interleaved-v1",
    fps: 60,
    frameCount: 4,
    channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
    binaryPath: "/analysis/fixture.envelopes.u8",
    valueRange: [0, 255]
  }
};

const bytes = Uint8Array.from([
  0, 0, 0, 0, 0, 0, 0,
  0, 85, 0, 0, 0, 0, 64,
  0, 170, 0, 0, 0, 0, 128,
  0, 255, 0, 0, 0, 0, 255
]);

describe("analysis hydration", () => {
  it("validates the expected byte count for interleaved envelopes", () => {
    expect(() => hydrateAnalysisArtifact(metadata, Uint8Array.from([1, 2, 3]))).toThrow(/Expected 28 bytes/i);
  });

  it("samples frame-aligned envelopes without interpolation when fps matches", () => {
    const analysis = hydrateAnalysisArtifact(metadata, bytes);
    const sample = sampleEnvelopeAtTime(analysis, 1 / 60, 60);

    expect(sample.bands.bass).toBeCloseTo(85 / 255, 3);
    expect(sample.loudness).toBeCloseTo(64 / 255, 3);
  });

  it("interpolates envelopes when the composition fps differs", () => {
    const analysis = hydrateAnalysisArtifact(metadata, bytes);
    const sample = sampleEnvelopeAtTime(analysis, 1 / 24, 24);

    expect(sample.bands.bass).toBeCloseTo(((170 / 255) + 1) / 2, 2);
    expect(sample.loudness).toBeCloseTo(((128 / 255) + 1) / 2, 2);
  });
});
