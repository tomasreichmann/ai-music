import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { LoadedSongAnalysisArtifact, LyricsArtifact } from "../lib/types";
import { LyricsEditorPanel } from "./LyricsEditorPanel";

const analysis: LoadedSongAnalysisArtifact = {
  songId: "lyrics-panel-test",
  audioPath: "/audio/lyrics-panel-test.wav",
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
    binaryPath: "/analysis/lyrics-panel-test.envelopes.u8",
    valueRange: [0, 255]
  },
  envelopeBytes: new Uint8Array(120 * 7)
};

const lyrics: LyricsArtifact = {
  songId: "lyrics-panel-test",
  audioPath: "/audio/lyrics-panel-test.wav",
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
    },
    {
      id: "line-2",
      text: "Second line",
      startBeat: 2,
      endBeat: 4,
      words: [
        { text: "Second", startBeat: 2, endBeat: 3 },
        { text: "line", startBeat: 3, endBeat: 4 }
      ]
    }
  ]
};

describe("LyricsEditorPanel", () => {
  it("renders selected line details with save action and no line navigation list", () => {
    const onLyricsChange = vi.fn();
    const onSaveLyrics = vi.fn();

    render(
      <LyricsEditorPanel
        analysis={analysis}
        activeLineId="line-2"
        selectedLineId="line-1"
        lyrics={lyrics}
        onLyricsChange={onLyricsChange}
        canSaveLyrics
        lyricsDirty
        lyricsSaveState="idle"
        lyricsSaveMessage={null}
        onSaveLyrics={onSaveLyrics}
      />
    );

    expect(screen.queryByRole("list", { name: /lyric lines/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /first line/i })).toBeInTheDocument();
    expect(screen.getByText("Word Anchors")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save lyrics/i }));
    expect(onSaveLyrics).toHaveBeenCalledTimes(1);
  });
});
