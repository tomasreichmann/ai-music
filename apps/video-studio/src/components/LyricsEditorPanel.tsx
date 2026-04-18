import { useMemo } from "react";

import { adjustLyricWordBoundary, getLyricLineWindow } from "../lib/timeline-editing";
import { getBeatTime } from "../lib/timing";
import type { LyricsArtifact, SongAnalysisArtifact } from "../lib/types";

type LyricsEditorPanelProps = {
  analysis: SongAnalysisArtifact | null;
  activeLineId: string | null;
  selectedLineId: string | null;
  lyrics: LyricsArtifact | null;
  onLyricsChange: (nextLyrics: LyricsArtifact) => void;
  canSaveLyrics: boolean;
  lyricsDirty: boolean;
  lyricsSaveState: "idle" | "saving" | "saved" | "error";
  lyricsSaveMessage: string | null;
  onSaveLyrics: () => void | Promise<void>;
};

const beatText = (value: number): string => value.toFixed(2);

const secondsText = (analysis: SongAnalysisArtifact | null, beatValue: number | undefined): string => {
  if (!analysis || typeof beatValue !== "number") {
    return "--";
  }
  return `${getBeatTime(analysis, beatValue).toFixed(2)}s`;
};

export const LyricsEditorPanel = ({
  analysis,
  activeLineId,
  selectedLineId,
  lyrics,
  onLyricsChange,
  canSaveLyrics,
  lyricsDirty,
  lyricsSaveState,
  lyricsSaveMessage,
  onSaveLyrics
}: LyricsEditorPanelProps) => {
  const selectedLine = useMemo(
    () =>
      lyrics?.lines.find((line) => line.id === selectedLineId) ??
      lyrics?.lines.find((line) => line.id === activeLineId) ??
      lyrics?.lines[0] ??
      null,
    [activeLineId, lyrics, selectedLineId]
  );
  const selectedWindow = selectedLine ? getLyricLineWindow(selectedLine) : null;
  const selectedLineIndex = selectedLine ? lyrics?.lines.findIndex((line) => line.id === selectedLine.id) ?? -1 : -1;
  const saveStatusText =
    lyricsSaveMessage ??
    (canSaveLyrics ? (lyricsDirty ? "Unsaved timing edits." : "All timing edits saved.") : "Saving is unavailable for this song.");

  if (!lyrics?.lines.length) {
    return (
      <section className="detail-block lyrics-editor">
        <p className="eyebrow">Lyrics</p>
        <h2>Timing pass</h2>
        <p className="prompt-copy">No lyric lines are available for this song yet.</p>
      </section>
    );
  }

  const handleWordBeatChange = (
    wordIndex: number,
    field: "startBeat" | "endBeat",
    nextValue: string
  ) => {
    if (!selectedLine || !selectedLine.words?.length) {
      return;
    }
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    onLyricsChange(
      adjustLyricWordBoundary(lyrics, selectedLine.id, wordIndex, field, parsed, {
        snapEnabled: false,
        shiftKey: false
      })
    );
  };

  return (
    <section className="detail-block lyrics-editor">
      <header className="lyrics-editor-header">
        <div>
          <p className="eyebrow">Lyrics</p>
          <h2>Timing pass</h2>
        </div>
        <div className="lyrics-save-row">
          <p className={`status-copy ${lyricsSaveState === "error" ? "status-copy--error" : ""}`}>{saveStatusText}</p>
          {canSaveLyrics ? (
            <button
              type="button"
              className="studio-button"
              onClick={onSaveLyrics}
              disabled={lyricsSaveState === "saving" || !lyricsDirty}
            >
              {lyricsSaveState === "saving" ? "Saving..." : "Save lyrics"}
            </button>
          ) : null}
        </div>
      </header>

      <div className="lyrics-grid">
        {selectedLine ? (
          <article className="lyrics-editor-card">
            <header className="lyrics-editor-card-header">
              <div>
                <p className="eyebrow">Selected Line</p>
                <h3>{selectedLine.text}</h3>
                <p className="status-copy">
                  {selectedLineIndex >= 0 ? `Line ${selectedLineIndex + 1}` : "Line"} |{" "}
                  {selectedWindow ? `${beatText(selectedWindow.startBeat)} - ${beatText(selectedWindow.endBeat)} beats` : "Timing unavailable"}
                </p>
              </div>
              <p className="status-copy">
                Active now: {activeLineId === selectedLine.id ? "yes" : "no"}
              </p>
            </header>

            <div className="lyrics-editor-window">
              <span>Line window</span>
              <strong>
                {selectedWindow
                  ? `${secondsText(analysis, selectedWindow.startBeat)} - ${secondsText(analysis, selectedWindow.endBeat)}`
                  : "--"}
              </strong>
            </div>

            <div className="lyrics-words">
              <div className="lyrics-words-header">
                <p className="eyebrow">Word Anchors</p>
                <p className="status-copy">{selectedLine.words?.length ?? 0} sections</p>
              </div>

              {selectedLine.words?.length ? (
                <div className="word-list">
                  {selectedLine.words.map((word, wordIndex) => (
                    <article key={`${word.text}-${wordIndex}`} className="word-row">
                      <span className="word-row-text">{word.text}</span>
                      <div className="word-row-window">
                        <span>
                          {secondsText(analysis, word.startBeat)} - {secondsText(analysis, word.endBeat)}
                        </span>
                      </div>
                      <label className="timing-field timing-field--compact">
                        <span>Start</span>
                        <input
                          aria-label={`${word.text} start beat`}
                          type="number"
                          step="0.25"
                          value={word.startBeat ?? 0}
                          onChange={(event) => handleWordBeatChange(wordIndex, "startBeat", event.target.value)}
                        />
                      </label>
                      <label className="timing-field timing-field--compact">
                        <span>End</span>
                        <input
                          aria-label={`${word.text} end beat`}
                          type="number"
                          step="0.25"
                          value={word.endBeat ?? 0}
                          onChange={(event) => handleWordBeatChange(wordIndex, "endBeat", event.target.value)}
                        />
                      </label>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="prompt-copy">This line does not have word anchors yet.</p>
              )}
            </div>
          </article>
        ) : (
          <p className="prompt-copy">Select a lyric line from the timeline to inspect its word anchors.</p>
        )}
      </div>
    </section>
  );
};
