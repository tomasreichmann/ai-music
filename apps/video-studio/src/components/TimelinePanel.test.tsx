import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getTimelineDragModifiers } from "./TimelinePanel";
import type { SongAnalysisArtifact, SongComposition } from "../lib/types";
import { TimelinePanel } from "./TimelinePanel";

describe("getTimelineDragModifiers", () => {
  it("reads shift and ctrl from getModifierState during a drag", () => {
    const modifiers = getTimelineDragModifiers(
      {
        shiftKey: false,
        ctrlKey: false,
        getModifierState: (key: string) => key === "Shift" || key === "Control"
      },
      { shiftKey: false, ctrlKey: false }
    );

    expect(modifiers).toEqual({
      shiftKey: true,
      ctrlKey: true
    });
  });

  it("keeps an already active modifier while the pointer event is neutral", () => {
    const modifiers = getTimelineDragModifiers(
      {
        shiftKey: false,
        ctrlKey: false
      },
      { shiftKey: true, ctrlKey: false }
    );

    expect(modifiers).toEqual({
      shiftKey: true,
      ctrlKey: false
    });
  });
});

describe("TimelinePanel", () => {
  const analysis: SongAnalysisArtifact = {
    songId: "timeline-panel-test",
    audioPath: "/audio/timeline-panel-test.wav",
    durationSec: 4,
    bpm: 120,
    beats: [
      { index: 1, timeSec: 0, bar: 1, isDownbeat: true },
      { index: 2, timeSec: 0.5, bar: 1, isDownbeat: false },
      { index: 3, timeSec: 1, bar: 1, isDownbeat: false }
    ],
    envelopes: {
      format: "uint8-interleaved-v1",
      fps: 30,
      frameCount: 120,
      channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
      binaryPath: "/analysis/timeline-panel-test.envelopes.u8",
      valueRange: [0, 255]
    }
  };

  const composition: SongComposition = {
    songId: "timeline-panel-test",
    title: "Timeline Panel Test",
    audioFile: "/audio/timeline-panel-test.wav",
    analysisFile: "/analysis/timeline-panel-test.json",
    fps: 30,
    width: 1280,
    height: 720,
    audioClips: [
      {
        id: "song",
        title: "Master Song",
        kind: "song",
        audioFile: "/audio/timeline-panel-test.wav",
        startSec: 0,
        endSec: 4
      },
      {
        id: "effect",
        title: "Effect Bed",
        kind: "track",
        audioFile: "/audio/effect-bed.wav",
        startSec: 1,
        endSec: 2.5
      }
    ],
    bookends: {
      intro: {
        id: "intro",
        title: "Intro",
        prompt: "",
        layers: [],
        effects: [],
        durationSec: 1
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
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        startBeat: 1,
        endBeat: 5,
        prompt: "",
        layers: [],
        effects: []
      }
    ]
  };

  it("renders an individual row for each audio clip", () => {
    render(
      <TimelinePanel analysis={analysis} composition={composition} currentBeat={1} currentTimeSec={1} activeSceneId="scene-1" />
    );

    expect(screen.getAllByText("Master Song").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Effect Bed").length).toBeGreaterThan(0);
  });

  it("keeps audio edge handles split across narrow clips", () => {
    const narrowComposition: SongComposition = {
      ...composition,
      audioClips: composition.audioClips?.map((clip) =>
        clip.id === "effect"
          ? {
              ...clip,
              endSec: 1.4
            }
          : clip
      )
    };

    render(
      <TimelinePanel
        analysis={analysis}
        composition={narrowComposition}
        currentBeat={1}
        currentTimeSec={1}
        activeSceneId="scene-1"
        onAudioClipsChange={() => undefined}
      />
    );

    const startHandle = screen.getByLabelText("Resize Effect Bed start");
    const endHandle = screen.getByLabelText("Resize Effect Bed end");

    expect(startHandle.getAttribute("style")).toContain("left: 0px");
    expect(startHandle.getAttribute("style")).toContain("width: 4px");
    expect(endHandle.getAttribute("style")).toContain("right: 0px");
    expect(endHandle.getAttribute("style")).toContain("width: 4px");
  });

  it("renders lyrics on a single compact row and shows beat labels below 500 percent zoom", () => {
    const lyricsComposition: SongComposition = {
      ...composition,
      lyrics: {
        songId: "timeline-panel-test",
        audioPath: "/audio/timeline-panel-test.wav",
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
          },
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
      }
    };

    const { container } = render(
      <TimelinePanel analysis={analysis} composition={lyricsComposition} currentBeat={1} currentTimeSec={1} activeSceneId="scene-1" />
    );

    expect(container.querySelectorAll(".timeline-row--lyrics")).toHaveLength(1);
    expect(screen.getByText("1: First line")).toBeInTheDocument();
    expect(screen.getByTitle("1: First line")).toBeInTheDocument();
    expect(container.querySelectorAll(".timeline-word")).toHaveLength(0);
    expect(container.querySelectorAll(".timeline-ruler-marker-label")).toHaveLength(analysis.beats.length);
  });

  it("selects lyric lines from timeline line and word items", () => {
    const onLyricLineSelect = vi.fn();
    const lyricsComposition: SongComposition = {
      ...composition,
      lyrics: {
        songId: "timeline-panel-test",
        audioPath: "/audio/timeline-panel-test.wav",
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
      }
    };

    render(
      <TimelinePanel
        analysis={analysis}
        composition={lyricsComposition}
        currentBeat={1}
        currentTimeSec={1}
        activeSceneId="scene-1"
        onLyricLineSelect={onLyricLineSelect}
      />
    );

    fireEvent.click(screen.getByText("1: First line"));

    for (let index = 0; index < 40; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    }

    fireEvent.click(screen.getByText("First"));

    expect(onLyricLineSelect).toHaveBeenNthCalledWith(1, "line-1");
    expect(onLyricLineSelect).toHaveBeenNthCalledWith(2, "line-1");
  });
});
