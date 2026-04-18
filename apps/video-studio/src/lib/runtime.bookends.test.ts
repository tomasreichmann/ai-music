import { hydrateAnalysisArtifact } from "./analysis";
import { getRuntimeState } from "./runtime";
import type { SongComposition } from "./types";

const analysis = hydrateAnalysisArtifact(
  {
    songId: "bookend-song",
    audioPath: "/audio/bookend-song.wav",
    durationSec: 4,
    bpm: 120,
    beats: [
      { index: 1, timeSec: 0, bar: 1, isDownbeat: true },
      { index: 2, timeSec: 0.5, bar: 1, isDownbeat: false },
      { index: 3, timeSec: 1, bar: 1, isDownbeat: false },
      { index: 4, timeSec: 1.5, bar: 1, isDownbeat: false },
      { index: 5, timeSec: 2, bar: 2, isDownbeat: true },
      { index: 6, timeSec: 2.5, bar: 2, isDownbeat: false },
      { index: 7, timeSec: 3, bar: 2, isDownbeat: false },
      { index: 8, timeSec: 3.5, bar: 2, isDownbeat: false },
      { index: 9, timeSec: 4, bar: 3, isDownbeat: true }
    ],
    envelopes: {
      format: "uint8-interleaved-v1",
      fps: 60,
      frameCount: 240,
      channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
      binaryPath: "/analysis/bookend-song.envelopes.u8",
      valueRange: [0, 255]
    }
  },
  Uint8Array.from(
    Array.from({ length: 240 }, (_, index) => {
      const value = Math.round((index / 239) * 255);
      return [32, value, 48, value, 24, 16, value];
    }).flat()
  )
);

const composition: SongComposition = {
  songId: "bookend-song",
  title: "Bookend Song",
  audioFile: "/audio/bookend-song.wav",
  analysisFile: "/analysis/bookend-song.analysis.json",
  fps: 30,
  width: 1280,
  height: 720,
  bookends: {
    intro: {
      id: "pre-roll",
      title: "Pre Roll",
      durationSec: 2,
      prompt: "cover art reveal",
      layers: [],
      effects: []
    },
    outro: {
      id: "post-roll",
      title: "Post Roll",
      durationSec: 1,
      prompt: "afterglow comedown",
      layers: [],
      effects: []
    }
  },
  lyrics: {
    songId: "bookend-song",
    audioPath: "/audio/bookend-song.wav",
    source: "draft",
    lines: [
      {
        id: "line-1",
        text: "Lost another hour to the bass",
        startBeat: 1,
        endBeat: 5,
        words: [
          { text: "Lost", startBeat: 1, endBeat: 1.5 },
          { text: "another", startBeat: 1.5, endBeat: 2.75 },
          { text: "hour", startBeat: 2.75, endBeat: 3.5 },
          { text: "to", startBeat: 3.5, endBeat: 3.9 },
          { text: "the", startBeat: 3.9, endBeat: 4.2 },
          { text: "bass", startBeat: 4.2, endBeat: 5 }
        ]
      },
      {
        id: "line-2",
        text: "Floating through the venue",
        startBeat: 5,
        endBeat: 9
      }
    ]
  },
  scenes: [
    {
      id: "body",
      title: "Song Body",
      startBeat: 1,
      endBeat: 9,
      prompt: "core performance scene",
      layers: [],
      effects: []
    }
  ]
};

describe("runtime bookends and lyric sync", () => {
  it("resolves the intro bookend before the song starts", () => {
    const state = getRuntimeState({
      analysis,
      composition,
      frame: 30
    });

    expect(state.activeSegmentType).toBe("intro");
    expect(state.activeBookend?.id).toBe("pre-roll");
    expect(state.songTimeSec).toBeNull();
    expect(state.activeLyricLine).toBeNull();
    expect(state.videoDurationSec).toBeCloseTo(7, 4);
  });

  it("resolves active lyric line and word during the song body", () => {
    const state = getRuntimeState({
      analysis,
      composition,
      frame: 75
    });

    expect(state.activeSegmentType).toBe("song");
    expect(state.activeScene?.id).toBe("body");
    expect(state.songTimeSec).toBeCloseTo(0.5, 4);
    expect(state.activeLyricLine?.id).toBe("line-1");
    expect(state.activeLyricWord?.text).toBe("another");
  });

  it("resolves the outro bookend after the song ends", () => {
    const state = getRuntimeState({
      analysis,
      composition,
      frame: 195
    });

    expect(state.activeSegmentType).toBe("outro");
    expect(state.activeBookend?.id).toBe("post-roll");
    expect(state.songTimeSec).toBeNull();
    expect(state.activeLyricLine).toBeNull();
  });
});
