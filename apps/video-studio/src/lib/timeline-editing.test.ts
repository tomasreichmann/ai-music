import type { AudioClipSpec, LyricsArtifact, SceneSpec, SongAnalysisArtifact } from "./types";
import {
  adjustAudioClipBoundary,
  adjustBookendBoundary,
  adjustLyricLineBoundary,
  adjustLyricWordBoundary,
  adjustSceneBoundary
} from "./timeline-editing";
import { getBeatAtTime } from "./timing";

const analysis: SongAnalysisArtifact = {
  songId: "timeline-editing-test",
  audioPath: "/audio/timeline-editing-test.wav",
  durationSec: 4,
  bpm: 120,
  beats: [
    { index: 1, timeSec: 0, bar: 1, isDownbeat: true },
    { index: 2, timeSec: 0.5, bar: 1, isDownbeat: false },
    { index: 3, timeSec: 1, bar: 1, isDownbeat: false },
    { index: 4, timeSec: 1.5, bar: 1, isDownbeat: false },
    { index: 5, timeSec: 2, bar: 2, isDownbeat: true }
  ],
  envelopes: {
    format: "uint8-interleaved-v1",
    fps: 30,
    frameCount: 120,
    channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
    binaryPath: "/analysis/timeline-editing-test.envelopes.u8",
    valueRange: [0, 255]
  }
};

const scenes: SceneSpec[] = [
  {
    id: "scene-a",
    title: "Scene A",
    startBeat: 1,
    endBeat: 10,
    prompt: "",
    layers: [],
    effects: []
  },
  {
    id: "scene-b",
    title: "Scene B",
    startBeat: 10,
    endBeat: 20,
    prompt: "",
    layers: [],
    effects: []
  },
  {
    id: "scene-c",
    title: "Scene C",
    startBeat: 20,
    endBeat: 30,
    prompt: "",
    layers: [],
    effects: []
  }
];

const lyrics: LyricsArtifact = {
  songId: "timeline-editing-test",
  audioPath: "/audio/timeline-editing-test.wav",
  source: "manual",
  lines: [
    {
      id: "line-1",
      text: "First line",
      startBeat: 1,
      endBeat: 4,
      words: [
        { text: "First", startBeat: 1, endBeat: 2 },
        { text: "line", startBeat: 2, endBeat: 4 }
      ]
    }
  ]
};

const composition = {
  songId: "timeline-editing-test",
  title: "Timeline Edit Test",
  audioFile: "/audio/timeline-editing-test.wav",
  analysisFile: "/analysis/timeline-editing-test.json",
  fps: 30,
  width: 1280,
  height: 720,
  bookends: {
    intro: {
      id: "intro",
      title: "Intro",
      prompt: "",
      layers: [],
      effects: [],
      durationSec: 2
    },
    outro: {
      id: "outro",
      title: "Outro",
      prompt: "",
      layers: [],
      effects: [],
      durationSec: 1
    }
  },
  scenes
};

const audioClip: AudioClipSpec = {
  id: "song",
  title: "Song",
  kind: "song",
  audioFile: "/audio/timeline-editing-test.wav",
  startSec: 0,
  endSec: 4,
  sourceStartSec: 0,
  sourceEndSec: 4
};

describe("timeline editing helpers", () => {
  it("converts time back to fractional beats", () => {
    expect(getBeatAtTime(analysis, 0)).toBeCloseTo(1, 4);
    expect(getBeatAtTime(analysis, 0.75)).toBeCloseTo(2.5, 4);
    expect(getBeatAtTime(analysis, 1.25)).toBeCloseTo(3.5, 4);
  });

  it("shifts lyric word boundaries and keeps the line window derived from the words", () => {
    const nextLyrics = adjustLyricWordBoundary(lyrics, "line-1", 0, "end", 1.5, {
      snapEnabled: false,
      shiftKey: false
    });

    expect(nextLyrics.lines[0].words?.[0].endBeat).toBe(1.5);
    expect(nextLyrics.lines[0].words?.[1].startBeat).toBe(1.5);
    expect(nextLyrics.lines[0].startBeat).toBe(1);
    expect(nextLyrics.lines[0].endBeat).toBe(4);
  });

  it("ripples lyric word timings when shift is held", () => {
    const nextLyrics = adjustLyricWordBoundary(lyrics, "line-1", 0, "end", 1.5, {
      snapEnabled: false,
      shiftKey: true
    });

    expect(nextLyrics.lines[0].words?.[0].endBeat).toBe(1.5);
    expect(nextLyrics.lines[0].words?.[1].startBeat).toBe(1.5);
    expect(nextLyrics.lines[0].words?.[1].endBeat).toBe(3.5);
    expect(nextLyrics.lines[0].startBeat).toBe(1);
    expect(nextLyrics.lines[0].endBeat).toBe(3.5);
  });

  it("resizes only the current lyric line when dragging line end without shift", () => {
    const nextLyrics = adjustLyricLineBoundary(
      {
        ...lyrics,
        lines: [
          lyrics.lines[0],
          {
            id: "line-2",
            text: "Second line",
            startBeat: 4,
            endBeat: 6,
            words: [
              { text: "Second", startBeat: 4, endBeat: 5 },
              { text: "line", startBeat: 5, endBeat: 6 }
            ]
          }
        ]
      },
      "line-1",
      "end",
      2.5,
      {
        snapEnabled: false,
        shiftKey: false
      }
    );

    expect(nextLyrics.lines[0].words?.[1].endBeat).toBe(2.5);
    expect(nextLyrics.lines[1].words?.[0].startBeat).toBe(4);
  });

  it("ripples later lyric lines when dragging line end with shift", () => {
    const nextLyrics = adjustLyricLineBoundary(
      {
        ...lyrics,
        lines: [
          lyrics.lines[0],
          {
            id: "line-2",
            text: "Second line",
            startBeat: 4,
            endBeat: 6,
            words: [
              { text: "Second", startBeat: 4, endBeat: 5 },
              { text: "line", startBeat: 5, endBeat: 6 }
            ]
          }
        ]
      },
      "line-1",
      "end",
      2.5,
      {
        snapEnabled: false,
        shiftKey: true
      }
    );

    expect(nextLyrics.lines[0].words?.[1].endBeat).toBe(2.5);
    expect(nextLyrics.lines[1].words?.[0].startBeat).toBe(2.5);
    expect(nextLyrics.lines[1].words?.[1].endBeat).toBe(4.5);
  });

  it("ripples the first lyric line to the right when shifting its start", () => {
    const nextLyrics = adjustLyricLineBoundary(
      {
        ...lyrics,
        lines: [
          lyrics.lines[0],
          {
            id: "line-2",
            text: "Second line",
            startBeat: 4,
            endBeat: 6,
            words: [
              { text: "Second", startBeat: 4, endBeat: 5 },
              { text: "line", startBeat: 5, endBeat: 6 }
            ]
          }
        ]
      },
      "line-1",
      "start",
      4,
      {
        snapEnabled: false,
        shiftKey: true
      }
    );

    expect(nextLyrics.lines[0].words?.[0].startBeat).toBe(4);
    expect(nextLyrics.lines[0].words?.[1].startBeat).toBe(5);
    expect(nextLyrics.lines[1].words?.[0].startBeat).toBe(7);
    expect(nextLyrics.lines[1].words?.[1].startBeat).toBe(8);
  });

  it("stretches lyric words to fit the resized line end", () => {
    const nextLyrics = adjustLyricLineBoundary(lyrics, "line-1", "end", 7, {
      snapEnabled: false,
      shiftKey: false
    });

    expect(nextLyrics.lines[0].words?.[0].startBeat).toBe(1);
    expect(nextLyrics.lines[0].words?.[0].endBeat).toBe(3);
    expect(nextLyrics.lines[0].words?.[1].startBeat).toBe(3);
    expect(nextLyrics.lines[0].words?.[1].endBeat).toBe(7);
  });

  it("trims the start of an audio clip without moving the end", () => {
    const nextClip = adjustAudioClipBoundary(audioClip, "start", 1.5, {
      snapEnabled: false,
      shiftKey: false
    });

    expect(nextClip.startSec).toBe(1.5);
    expect(nextClip.endSec).toBe(4);
    expect(nextClip.sourceStartSec).toBe(1.5);
    expect(nextClip.sourceEndSec).toBe(4);
  });

  it("moves an audio clip as a whole when shift is held", () => {
    const nextClip = adjustAudioClipBoundary(audioClip, "end", 5.5, {
      snapEnabled: false,
      shiftKey: true
    });

    expect(nextClip.startSec).toBe(1.5);
    expect(nextClip.endSec).toBe(5.5);
    expect(nextClip.sourceStartSec).toBe(0);
    expect(nextClip.sourceEndSec).toBe(4);
  });

  it("resizes intro and outro bookends independently", () => {
    const nextIntro = adjustBookendBoundary(composition, { durationSec: 4 }, "intro", "end", 3.25, {
      snapEnabled: false
    });
    const nextOutro = adjustBookendBoundary(composition, { durationSec: 4 }, "outro", "end", 6.5, {
      snapEnabled: false
    });

    expect(nextIntro.bookends?.intro?.startSec).toBe(0);
    expect(nextIntro.bookends?.intro?.endSec).toBe(3.25);
    expect(nextIntro.bookends?.intro?.durationSec).toBe(3.25);
    expect(nextOutro.bookends?.outro?.startSec).toBe(6);
    expect(nextOutro.bookends?.outro?.endSec).toBe(6.5);
  });

  it("ripple-shifts later scenes when a scene edge is dragged with shift", () => {
    const nextScenes = adjustSceneBoundary(scenes, 1, "start", 12, {
      snapEnabled: false,
      shiftKey: true
    });

    expect(nextScenes[0].endBeat).toBe(12);
    expect(nextScenes[1].startBeat).toBe(12);
    expect(nextScenes[1].endBeat).toBe(22);
    expect(nextScenes[2].startBeat).toBe(22);
    expect(nextScenes[2].endBeat).toBe(32);
  });

  it("allows the first scene to move before the master song", () => {
    const nextScenes = adjustSceneBoundary(scenes, 0, "start", -2, {
      snapEnabled: false,
      shiftKey: false
    });

    expect(nextScenes[0].startBeat).toBe(-2);
  });
});
