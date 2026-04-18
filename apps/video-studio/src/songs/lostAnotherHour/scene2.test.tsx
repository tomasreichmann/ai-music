import type { CSSProperties } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { hydrateAnalysisArtifact } from "../../lib/analysis";
import type { RuntimeState, SongComposition } from "../../lib/types";
import { LayeredScene2 } from "./LayeredScene2";
import { lostAnotherHourScene2 } from "./scene2";

vi.mock("remotion", () => ({
  Img: ({
    src,
    className,
    style
  }: {
    src: string;
    className?: string;
    style?: CSSProperties;
  }) => <img alt="" className={className} src={src} style={style} />,
  staticFile: (value: string) => `/static/${value}`
}));

beforeAll(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const analysis = hydrateAnalysisArtifact(
  {
    songId: "lost-another-hour-to-the-bass",
    audioPath: "/audio/lost-another-hour.wav",
    durationSec: 30,
    bpm: 120,
    beats: [
      { index: 44, timeSec: 0, bar: 11, isDownbeat: true },
      { index: 45, timeSec: 0.5, bar: 11, isDownbeat: false },
      { index: 46, timeSec: 1, bar: 11, isDownbeat: false },
      { index: 47, timeSec: 1.5, bar: 11, isDownbeat: false },
      { index: 48, timeSec: 2, bar: 12, isDownbeat: true },
      { index: 49, timeSec: 2.5, bar: 12, isDownbeat: false },
      { index: 50, timeSec: 3, bar: 12, isDownbeat: false },
      { index: 51, timeSec: 3.5, bar: 12, isDownbeat: false },
      { index: 52, timeSec: 4, bar: 13, isDownbeat: true }
    ],
    envelopes: {
      format: "uint8-interleaved-v1",
      fps: 30,
      frameCount: 120,
      channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
      binaryPath: "/analysis/lost-another-hour.envelopes.u8",
      valueRange: [0, 255]
    }
  },
  Uint8Array.from(Array.from({ length: 120 }, () => [16, 160, 32, 48, 24, 18, 88]).flat())
);

const song: SongComposition = {
  songId: "lost-another-hour-to-the-bass",
  title: "Lost Another Hour to the Bass",
  audioFile: "/audio/lost-another-hour.wav",
  analysisFile: "/analysis/lost-another-hour.json",
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: []
};

const backgroundHeight = song.height / 2;
const backgroundWidth = (backgroundHeight * 3072) / 512;
const backgroundOverflowX = backgroundWidth - song.width;

const baseRuntime: RuntimeState = {
  frame: 0,
  videoDurationSec: 30,
  currentBeat: 44,
  currentTimeSec: 0,
  songTimeSec: 0,
  activeSegmentType: "song",
  activeBookend: null,
  activeScene: null,
  activeLyricLine: null,
  activeLyricWord: null,
  sceneProgress: 0,
  songProgress: 0,
  beatPulse: 0.4,
  loudness: 0.35,
  bands: {
    sub: 0.2,
    bass: 0.5,
    lowMid: 0.28,
    mid: 0.24,
    highMid: 0.18,
    high: 0.14
  }
};

const readTranslate = (transform: string): { x: number; y: number } => {
  const match = /translate3d\(([-0-9.]+)px,\s*([-0-9.]+)(px|%),/.exec(transform);
  return {
    x: match ? Number(match[1]) : Number.NaN,
    y: match ? Number(match[2]) : Number.NaN
  };
};

const renderScene = (runtime: RuntimeState) =>
  render(
    <LayeredScene2
      scene={lostAnotherHourScene2}
      song={song}
      analysis={analysis}
      runtime={runtime}
      activeLyricLine={null}
      activeLyricWord={null}
      nextLyricLine={null}
    />
  );

describe("lostAnotherHourScene2", () => {
  it("wires the custom scene component to the scene spec", () => {
    expect(lostAnotherHourScene2.component).toBe(LayeredScene2);
    expect(lostAnotherHourScene2.layers).toHaveLength(4);
  });

  it("keeps the backgrounds aligned at the start and scrolls them with the expected parallax ratio", () => {
    const { container, rerender } = renderScene({
      ...baseRuntime,
      frame: 0,
      songTimeSec: 0,
      sceneProgress: 0
    });

    const bottom = container.querySelector(".scene-2-background--bottom") as HTMLImageElement;
    const top = container.querySelector(".scene-2-background--top") as HTMLImageElement;
    const line = container.querySelector(".scene-2-line") as HTMLImageElement;

    expect(bottom.style.width).toBe(`${backgroundWidth}px`);
    expect(top.style.width).toBe(`${backgroundWidth}px`);
    expect(line.style.width).toBe(`${backgroundWidth}px`);
    expect(bottom.style.height).toBe(`${backgroundHeight}px`);
    expect(top.style.height).toBe(`${backgroundHeight}px`);
    expect(readTranslate(bottom.style.transform)).toEqual({ x: 0, y: 0 });
    expect(readTranslate(top.style.transform)).toEqual({ x: 0, y: 0 });
    expect(readTranslate(line.style.transform)).toEqual({ x: 0, y: -50 });

    rerender(
      <LayeredScene2
        scene={lostAnotherHourScene2}
        song={song}
        analysis={analysis}
        runtime={{
          ...baseRuntime,
          frame: 45,
          songTimeSec: 1.5,
          sceneProgress: 0.0566
        }}
        activeLyricLine={null}
        activeLyricWord={null}
        nextLyricLine={null}
      />
    );

    const scrolledBottom = readTranslate(bottom.style.transform);
    const scrolledTop = readTranslate(top.style.transform);
    const scrolledLine = readTranslate(line.style.transform);

    expect(scrolledBottom.x).toBeGreaterThan(scrolledTop.x);
    expect(scrolledLine.x).toBeCloseTo(scrolledBottom.x, 2);
    expect(scrolledBottom.x).toBeGreaterThan(0);

    rerender(
      <LayeredScene2
        scene={lostAnotherHourScene2}
        song={song}
        analysis={analysis}
        runtime={{
          ...baseRuntime,
          frame: 90,
          songTimeSec: 30,
          sceneProgress: 1
        }}
        activeLyricLine={null}
        activeLyricWord={null}
        nextLyricLine={null}
      />
    );

    const settledBottom = readTranslate(bottom.style.transform);
    const settledTop = readTranslate(top.style.transform);
    const settledLine = readTranslate(line.style.transform);

    expect(settledBottom.x).toBeCloseTo(backgroundOverflowX, 2);
    expect(settledTop.x).toBeCloseTo(backgroundOverflowX * 0.8, 2);
    expect(settledLine.x).toBeCloseTo(backgroundOverflowX, 2);
  });

  it("drops the straw from above the frame to mid-screen before letting it jitter", () => {
    const { container, rerender } = renderScene({
      ...baseRuntime,
      frame: 0,
      songTimeSec: 0,
      sceneProgress: 0
    });

    const straw = container.querySelector(".scene-2-straw") as HTMLImageElement;
    expect(straw).not.toBeNull();
    expect(readTranslate(straw.style.transform).y).toBeLessThan(0);

    rerender(
      <LayeredScene2
        scene={lostAnotherHourScene2}
        song={song}
        analysis={analysis}
        runtime={{
          ...baseRuntime,
          frame: 18,
          songTimeSec: 0.6,
          sceneProgress: 0.02
        }}
        activeLyricLine={null}
        activeLyricWord={null}
        nextLyricLine={null}
      />
    );

    const settledStraw = readTranslate(straw.style.transform);
    expect(settledStraw.y).toBeCloseTo(0, 2);
    expect(straw.style.transform).toContain("rotate(");
  });
});
