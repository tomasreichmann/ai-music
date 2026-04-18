import { hydrateAnalysisArtifact } from "./analysis";
import type { SceneSpec, SongComposition } from "./types";
import { getRuntimeState } from "./runtime";

const scenes: SceneSpec[] = [
  {
    id: "intro",
    title: "Intro Drift",
    startBeat: 1,
    endBeat: 9,
    prompt: "dawn traffic reflected in wet concrete",
    layers: [],
    effects: []
  },
  {
    id: "lift",
    title: "Lift",
    startBeat: 9,
    endBeat: 17,
    prompt: "city core opening into altitude",
    layers: [],
    effects: []
  }
];

const composition: SongComposition = {
  songId: "pulse-demo",
  title: "Pulse Demo",
  audioFile: "/audio/demo-song.wav",
  analysisFile: "/analysis/pulse-demo.analysis.json",
  fps: 30,
  width: 1280,
  height: 720,
  audioClips: [
    {
      id: "song",
      title: "Song",
      kind: "song",
      audioFile: "/audio/demo-song.wav",
      startSec: 0,
      endSec: 1
    }
  ],
  scenes
};

const analysis = hydrateAnalysisArtifact(
  {
    songId: "pulse-demo",
    audioPath: "/audio/demo-song.wav",
    durationSec: 1,
    bpm: 120,
    beats: [
      { index: 1, timeSec: 0, bar: 1, isDownbeat: true },
      { index: 2, timeSec: 0.5, bar: 1, isDownbeat: false },
      { index: 3, timeSec: 1, bar: 1, isDownbeat: false }
    ],
    envelopes: {
      format: "uint8-interleaved-v1",
      fps: 60,
      frameCount: 60,
      channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
      binaryPath: "/analysis/pulse-demo.envelopes.u8",
      valueRange: [0, 255]
    }
  },
  Uint8Array.from(
    Array.from({ length: 60 }, (_, index) => {
      const bass = Math.round((index / 59) * 255);
      const mid = Math.round((0.25 + index / 236) * 255);
      const loudness = Math.round((0.15 + index / 118) * 255);
      return [0, bass, 32, mid, 16, 8, loudness];
    }).flat()
  )
);

describe("runtime signals", () => {
  it("samples dense envelope data and resolves the active scene", () => {
    const state = getRuntimeState({
      analysis,
      composition,
      frame: 15
    });

    expect(state.currentTimeSec).toBeCloseTo(0.5, 4);
    expect(state.currentBeat).toBe(2);
    expect(state.activeScene?.id).toBe("intro");
    expect(state.sceneProgress).toBeGreaterThan(0.1);
    expect(state.sceneProgress).toBeLessThan(0.2);
    expect(state.bands.bass).toBeCloseTo(0.5, 1);
    expect(state.bands.mid).toBeCloseTo(0.37, 1);
    expect(state.loudness).toBeCloseTo(0.4, 1);
    expect(state.beatPulse).toBeGreaterThan(0);
  });

  it("anchors song time to the song clip when the clip starts after zero", () => {
    const anchoredComposition: SongComposition = {
      ...composition,
      audioClips: [
        {
          id: "song",
          title: "Song",
          kind: "song",
          audioFile: "/audio/demo-song.wav",
          startSec: 1,
          endSec: 2
        }
      ]
    };

    const state = getRuntimeState({
      analysis,
      composition: anchoredComposition,
      frame: 45
    });

    expect(state.songTimeSec).toBeCloseTo(0.5, 4);
    expect(state.activeSegmentType).toBe("song");
  });
});
