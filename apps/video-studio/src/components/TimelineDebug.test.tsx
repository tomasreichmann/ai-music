import { act, fireEvent, render, screen } from "@testing-library/react";

import analysis from "../data/demo-analysis.json";
import type { SongComposition } from "../lib/types";
import { TimelineDebug } from "./TimelineDebug";

const composition: SongComposition = {
  songId: "pulse-demo",
  title: "Pulse Demo",
  audioFile: "/audio/demo-song.wav",
  analysisFile: "/analysis/pulse-demo.analysis.json",
  fps: 30,
  width: 1280,
  height: 720,
  bookends: {
    intro: {
      id: "intro",
      title: "Intro Bed",
      prompt: "dawn traffic reflected in wet concrete",
      layers: [],
      effects: [],
      durationSec: 2.5
    },
    outro: {
      id: "outro",
      title: "Outro Bed",
      prompt: "fade into static and dusk",
      layers: [],
      effects: [],
      durationSec: 1.5
    }
  },
  scenes: [
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
  ],
  lyrics: {
    songId: "pulse-demo",
    audioPath: "/audio/demo-song.wav",
    source: "manual",
    lines: [
      {
        id: "line-1",
        text: "First line",
        startBeat: 1,
        endBeat: 2,
        words: [
          { text: "First", startBeat: 1, endBeat: 1.5 },
          { text: "line", startBeat: 1.5, endBeat: 2 }
        ]
      }
    ]
  }
};

describe("TimelineDebug", () => {
  it("renders the Timeline panel with zoom controls and scene labels", () => {
    render(
      <TimelineDebug
        analysis={analysis}
        composition={composition}
        currentBeat={6}
        currentTimeSec={2.5}
        activeSceneId="intro"
        onBookendsChange={() => undefined}
        onLyricsChange={() => undefined}
        onScenesChange={() => undefined}
      />
    );

    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resize intro bed end/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resize outro bed start/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resize line 1 start/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resize line 1 end/i })).toBeInTheDocument();
    expect(screen.getAllByText("Pulse Demo").length).toBeGreaterThan(0);
    expect(screen.getByText("Intro Drift")).toBeInTheDocument();
    expect(screen.getByText("Lift")).toBeInTheDocument();
    expect(screen.getByText(/Beat 6/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2.50s/i).length).toBeGreaterThan(0);
  });

  it("reveals word rows at 1000 percent zoom and clamps at 2000 percent", () => {
    render(
      <TimelineDebug
        analysis={analysis}
        composition={composition}
        currentBeat={6}
        currentTimeSec={2.5}
        activeSceneId="intro"
        onBookendsChange={() => undefined}
        onLyricsChange={() => undefined}
        onScenesChange={() => undefined}
      />
    );

    expect(screen.queryByText("First")).not.toBeInTheDocument();

    const zoomIn = screen.getByRole("button", { name: /zoom in/i });
    act(() => {
      for (let index = 0; index < 36; index += 1) {
        fireEvent.click(zoomIn);
      }
    });

    expect(screen.getAllByText("1000%").length).toBe(2);
    expect(screen.getByText("First")).toBeInTheDocument();

    act(() => {
      for (let index = 0; index < 40; index += 1) {
        fireEvent.click(zoomIn);
      }
    });

    expect(screen.getAllByText("2000%").length).toBe(2);

    act(() => {
      fireEvent.click(zoomIn);
    });

    expect(screen.getAllByText("2000%").length).toBe(2);
  });
});
