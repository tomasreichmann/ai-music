import type { CSSProperties, PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { hydrateAnalysisArtifact } from "../lib/analysis";
import type { SongComposition } from "../lib/types";
import { MusicVideoComposition } from "./MusicVideoComposition";

vi.mock("remotion", () => ({
  AbsoluteFill: ({
    children,
    className,
    style
  }: PropsWithChildren<{ className?: string; style?: CSSProperties }>) => (
    <div className={className} style={style}>
      {children}
    </div>
  ),
  Audio: ({ src }: { src: string }) => <div data-src={src} />,
  Img: ({
    src,
    className,
    style
  }: {
    src: string;
    className?: string;
    style?: CSSProperties;
  }) => <img alt="" className={className} src={src} style={style} />,
  Sequence: ({ children }: PropsWithChildren) => <>{children}</>,
  interpolate: (value: number, inputRange: [number, number], outputRange: [number, number]) => {
    const [inputStart, inputEnd] = inputRange;
    const [outputStart, outputEnd] = outputRange;
    const progress = (value - inputStart) / Math.max(inputEnd - inputStart, 0.0001);
    return outputStart + (outputEnd - outputStart) * progress;
  },
  staticFile: (value: string) => `/static/${value}`,
  useCurrentFrame: () => 15
}));

const analysis = hydrateAnalysisArtifact(
  {
    songId: "composition-test",
    audioPath: "/audio/composition-test.wav",
    durationSec: 2,
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
      frameCount: 60,
      channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
      binaryPath: "/analysis/composition-test.envelopes.u8",
      valueRange: [0, 255]
    }
  },
  Uint8Array.from(
    Array.from({ length: 60 }, () => [8, 96, 32, 40, 24, 16, 88]).flat()
  )
);

const composition: SongComposition = {
  songId: "composition-test",
  title: "Composition Test",
  audioFile: "/audio/composition-test.wav",
  analysisFile: "/analysis/composition-test.json",
  fps: 30,
  width: 1280,
  height: 720,
  lyrics: {
    songId: "composition-test",
    audioPath: "/audio/composition-test.wav",
    source: "test",
    lines: [
      {
        id: "line-1",
        text: "Lost another hour to the bass",
        startBeat: 1,
        endBeat: 5
      }
    ]
  },
  scenes: [
    {
      id: "body",
      title: "Song Body",
      startBeat: 1,
      endBeat: 5,
      prompt: "scene prompt should stay out of the caption layer",
      layers: [{ id: "base", label: "Base", src: "/images/city.svg" }],
      effects: []
    }
  ]
};

describe("MusicVideoComposition", () => {
  it("keeps lyric rendering on a stable overlay outside the transformed stage", () => {
    const { container } = render(<MusicVideoComposition song={composition} analysis={analysis} />);
    const stage = container.querySelector(".composition-stage");
    const caption = container.querySelector(".lyric-caption");

    expect(screen.getByText("Lost")).toBeInTheDocument();
    expect(stage).not.toBeNull();
    expect(caption).not.toBeNull();
    expect((stage as HTMLElement).contains(caption as HTMLElement)).toBe(false);
  });

  it("keeps scene debug hidden by default", () => {
    const { container } = render(<MusicVideoComposition song={composition} analysis={analysis} />);

    expect(screen.queryByText("Song Body")).not.toBeInTheDocument();
    expect(container.querySelector(".composition-caption")).toBeNull();
    expect(container.querySelector(".composition-debug")).toBeNull();
  });

  it("renders the scene title in a compact debug badge when enabled", () => {
    const { container } = render(
      <MusicVideoComposition song={composition} analysis={analysis} showSceneDebug />
    );

    expect(screen.getByText("Song Body")).toBeInTheDocument();
    expect(container.querySelector(".composition-debug")).not.toBeNull();
    expect(container.querySelector(".composition-caption")).toBeNull();
  });

  it("renders a custom active scene component and keeps lyrics on the shared overlay layer", () => {
    const CustomScene = () => <div data-testid="custom-scene">custom scene</div>;
    const customComposition: SongComposition = {
      ...composition,
      scenes: [
        {
          ...composition.scenes[0],
          component: CustomScene
        } as SongComposition["scenes"][number]
      ]
    };

    const { container } = render(<MusicVideoComposition song={customComposition} analysis={analysis} />);
    const stage = container.querySelector(".composition-stage");
    const caption = container.querySelector(".lyric-caption");

    expect(screen.getByTestId("custom-scene")).toBeInTheDocument();
    expect(screen.getByText("Lost")).toBeInTheDocument();
    expect(stage).not.toBeNull();
    expect(caption).not.toBeNull();
    expect((stage as HTMLElement).contains(caption as HTMLElement)).toBe(false);
  });

  it("keeps bookends on the generic renderer path", () => {
    const introComposition: SongComposition = {
      ...composition,
      bookends: {
        intro: {
          id: "intro",
          title: "Intro",
          durationSec: 1,
          prompt: "intro scene",
          layers: [{ id: "intro-base", label: "Intro Base", src: "/images/flare.svg" }],
          effects: []
        }
      }
    };

    const { container } = render(<MusicVideoComposition song={introComposition} analysis={analysis} />);

    expect(container.querySelector('img[src="/static/images/flare.svg"]')).not.toBeNull();
  });

  it("renders a custom intro bookend component when one is attached", () => {
    const CustomIntro = () => <div data-testid="custom-intro">custom intro</div>;
    const introComposition: SongComposition = {
      ...composition,
      bookends: {
        intro: {
          id: "intro",
          title: "Intro",
          durationSec: 1,
          prompt: "intro scene",
          layers: [{ id: "intro-base", label: "Intro Base", src: "/images/flare.svg" }],
          effects: [],
          component: CustomIntro
        } as NonNullable<SongComposition["bookends"]>["intro"]
      }
    };

    render(<MusicVideoComposition song={introComposition} analysis={analysis} />);

    expect(screen.getByTestId("custom-intro")).toBeInTheDocument();
    expect(screen.queryByText("Lost")).not.toBeInTheDocument();
  });

  it("renders masked layers with custom transform origins and motion filters", () => {
    const animatedComposition: SongComposition = {
      ...composition,
      scenes: [
        {
          ...composition.scenes[0],
          transformOrigin: "25% 75%",
          effects: [
            {
              kind: "zoomPan",
              bindings: {
                scale: { source: "sceneProgress", outputRange: [1, 1.2] }
              }
            }
          ],
          layers: [
            {
              id: "masked",
              label: "Masked",
              src: "/images/city.svg",
              maskSrc: "/images/mask.png",
              maskMode: "luminance",
              transformOrigin: "10% 90%",
              motion: {
                translateY: { source: "sceneProgress", outputRange: [0, -10] },
                rotate: { source: "songProgress", outputRange: [0, -15] },
                brightness: { source: "sceneProgress", outputRange: [0.8, 1.6] },
                hueRotate: { source: "songProgress", outputRange: [0, 45] }
              }
            }
          ]
        }
      ]
    };

    const { container } = render(<MusicVideoComposition song={animatedComposition} analysis={analysis} />);

    const stage = container.querySelector(".composition-stage");
    const maskedLayer = container.querySelector('img[src="/static/images/city.svg"]');

    expect(stage).not.toBeNull();
    expect(maskedLayer).not.toBeNull();
    expect((stage as HTMLElement).style.transformOrigin).toBe("25% 75%");
    expect((maskedLayer as HTMLElement).style.transformOrigin).toBe("10% 90%");
    expect((maskedLayer as HTMLElement).style.maskImage).toBe('url("/static/images/mask.png")');
    expect((maskedLayer as HTMLElement).style.maskMode).toBe("luminance");
    expect((maskedLayer as HTMLElement).style.filter).toContain("brightness(");
    expect((maskedLayer as HTMLElement).style.filter).toContain("hue-rotate(");
    expect((maskedLayer as HTMLElement).style.transform).toContain("rotate(");
  });
});
