import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import type { LoadedSongAnalysisArtifact } from "./lib/types";
import App from "./App";
import { lostAnotherHourSong } from "./songs/lostAnotherHour";

const frameListeners = new Set<(event: { detail: { frame: number } }) => void>();
let playerRenderCount = 0;

const createLoadedAnalysis = (): LoadedSongAnalysisArtifact => ({
  songId: "player-sync-test",
  audioPath: "/audio/player-sync-test.wav",
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
    fps: 30,
    frameCount: 120,
    channels: ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"],
    binaryPath: "/analysis/player-sync-test.envelopes.u8",
    valueRange: [0, 255]
  },
  envelopeBytes: Uint8Array.from(Array.from({ length: 120 }, () => [0, 192, 48, 96, 32, 16, 128]).flat())
});

const emitFrameUpdate = (frame: number) => {
  for (const listener of frameListeners) {
    listener({ detail: { frame } });
  }
};

const mockFetchAnalysisArtifact = vi.fn();
const mockFetchJsonArtifact = vi.fn();
const mockSaveLyrics = vi.fn();

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  return {
    Player: React.forwardRef((_props, ref) => {
      playerRenderCount += 1;
      const playerRef = {
        addEventListener: vi.fn((name: string, callback: (event: { detail: { frame: number } }) => void) => {
          if (name === "frameupdate") {
            frameListeners.add(callback);
          }
        }),
        removeEventListener: vi.fn((name: string, callback: (event: { detail: { frame: number } }) => void) => {
          if (name === "frameupdate") {
            frameListeners.delete(callback);
          }
        }),
        getContainerNode: vi.fn(() => null),
        getScale: vi.fn(() => 1),
        play: vi.fn(),
        pause: vi.fn(),
        toggle: vi.fn(),
        seekTo: vi.fn(),
        getCurrentFrame: vi.fn(() => 0),
        requestFullscreen: vi.fn(),
        exitFullscreen: vi.fn(),
        isFullscreen: vi.fn(() => false),
        setVolume: vi.fn(),
        getVolume: vi.fn(() => 1),
        isMuted: vi.fn(() => false),
        isPlaying: vi.fn(() => false),
        mute: vi.fn(),
        unmute: vi.fn(),
        pauseAndReturnToPlayStart: vi.fn()
      };

      React.useImperativeHandle(ref, () => playerRef, []);
      return <div>Player Stub</div>;
    })
  };
});

vi.mock("./components/TimelineDebug", () => ({
      TimelineDebug: ({
        currentBeat,
        currentTimeSec,
        onLyricLineSelect
  }: {
    currentBeat: number;
    currentTimeSec: number;
    onLyricLineSelect?: (lineId: string) => void;
      }) => (
    <div>
      <span>{`Beat ${currentBeat}`}</span>
      <span>{`${currentTimeSec.toFixed(2)}s`}</span>
      <button
        type="button"
        onClick={() => onLyricLineSelect?.(lostAnotherHourSong.lyrics?.lines[0]?.id ?? "timeline-picked-line")}
      >
        Select lyric line
      </button>
    </div>
  )
}));

vi.mock("./lib/analysis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/analysis")>();
  return {
    ...actual,
    fetchAnalysisArtifact: (...args: unknown[]) => mockFetchAnalysisArtifact(...args),
    fetchJsonArtifact: (...args: unknown[]) => mockFetchJsonArtifact(...args)
  };
});

vi.mock("./lib/api", () => ({
  saveLyrics: (...args: unknown[]) => mockSaveLyrics(...args)
}));

describe("App", () => {
  beforeEach(() => {
    frameListeners.clear();
    playerRenderCount = 0;
    mockFetchAnalysisArtifact.mockReset();
    mockFetchJsonArtifact.mockReset();
    mockSaveLyrics.mockReset();
    mockFetchAnalysisArtifact.mockImplementation(() => new Promise(() => {}));
    mockFetchJsonArtifact.mockImplementation(() => new Promise(() => {}));
    mockSaveLyrics.mockResolvedValue({
      song_id: "lost-another-hour-to-the-bass",
      lyrics_source_file: "apps/video-studio/src/songs/lostAnotherHour/lyrics.ts",
      lyrics_source_export: "lostAnotherHourLyrics"
    });
  });

  it("removes the marketing copy and prompt draft controls from the current UI", () => {
    render(<App />);

    expect(screen.queryByText("Build scenes in code, preview with intent, render with rhythm.")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /Single-user control room for layered stills, audio-reactive effects, reusable presets, and precise beat math/
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Prompt Draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate Scene Image")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /overview/i })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /scene stack/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /live drivers/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /lyrics/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("removes the duplicate scrubber UI and follows the player scrub position", async () => {
    mockFetchAnalysisArtifact.mockResolvedValue(createLoadedAnalysis());

    render(<App />);

    await waitFor(() => expect(mockFetchAnalysisArtifact).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Signal scrubber")).not.toBeInTheDocument();
    await waitFor(() => expect(frameListeners.size).toBeGreaterThan(0));

    act(() => {
      emitFrameUpdate(75);
    });

    await waitFor(() => {
      expect(screen.getByText(/2.50s/i)).toBeInTheDocument();
      expect(screen.getByText(/83%/i)).toBeInTheDocument();
    });
    expect(playerRenderCount).toBe(1);
  });

  it("opens the Lyrics tab to edit lyric timings", async () => {
    mockFetchAnalysisArtifact.mockResolvedValue(createLoadedAnalysis());

    render(<App />);

    await waitFor(() => expect(mockFetchAnalysisArtifact).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("tab", { name: /lyrics/i }));

    expect(screen.getByText(/lyric sync/i)).toBeInTheDocument();
    expect(screen.getByText(/word anchors/i)).toBeInTheDocument();
  });

  it("opens lyrics from timeline selection and saves with source metadata", async () => {
    mockFetchAnalysisArtifact.mockResolvedValue(createLoadedAnalysis());

    render(<App />);

    await waitFor(() => expect(mockFetchAnalysisArtifact).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /select lyric line/i }));
    expect(screen.getByRole("tab", { name: /lyrics/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: lostAnotherHourSong.lyrics?.lines[0]?.text ?? "" })).toBeInTheDocument();

    const firstBeatInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(firstBeatInput, { target: { value: "14.25" } });

    fireEvent.click(screen.getByRole("button", { name: /save lyrics/i }));

    await waitFor(() => expect(mockSaveLyrics).toHaveBeenCalledTimes(1));
    expect(mockSaveLyrics).toHaveBeenCalledWith(
      expect.objectContaining({
        songId: "lost-another-hour-to-the-bass",
        lyricsSourceFile: "apps/video-studio/src/songs/lostAnotherHour/lyrics.ts",
        lyricsSourceExport: "lostAnotherHourLyrics",
        lyrics: expect.any(Object)
      })
    );
  });
});
