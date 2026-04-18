import { Player, type CallbackListener, type PlayerRef } from "@remotion/player";
import { forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";

import { TimelineDebug } from "./components/TimelineDebug";
import { LyricsEditorPanel } from "./components/LyricsEditorPanel";
import { fetchAnalysisArtifact, fetchJsonArtifact } from "./lib/analysis";
import { saveLyrics } from "./lib/api";
import { getRuntimeState, getVideoDurationSec } from "./lib/runtime";
import { getBookendWindow, getSongTimelineStartSec, getTimelineAudioClips } from "./lib/timeline-arrangement";
import { getBeatTime } from "./lib/timing";
import type { LyricsArtifact } from "./lib/types";
import { MusicVideoComposition } from "./remotion/MusicVideoComposition";
import { demoAnalysisMeta } from "./songs/demoSong";
import { getSongById, songCatalog } from "./songs";

const formatPercent = (value: number | null | undefined) => (value == null ? "--" : `${Math.round(value * 100)}%`);
const getLyricsSnapshot = (lyrics: LyricsArtifact | null | undefined): string | null =>
  lyrics ? JSON.stringify(lyrics) : null;

const playerStyle = { width: "100%", aspectRatio: "16 / 9", borderRadius: 0, overflow: "hidden" } as const;
type DetailTab = "scene-stack" | "drivers" | "lyrics";

type PreviewPlayerProps = {
  analysis: Awaited<ReturnType<typeof fetchAnalysisArtifact>>;
  durationInFrames: number;
  song: ReturnType<typeof getSongById>;
};

const PreviewPlayer = memo(
  forwardRef<PlayerRef, PreviewPlayerProps>(function PreviewPlayer({ analysis, durationInFrames, song }, ref) {
    const inputProps = useMemo(() => ({ song, analysis, showSceneDebug: true }), [analysis, song]);

    return (
      <Player
        ref={ref}
        component={MusicVideoComposition}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={song.fps}
        compositionWidth={song.width}
        compositionHeight={song.height}
        controls
        style={playerStyle}
      />
    );
  })
);

function App() {
  const playerRef = useRef<PlayerRef>(null);
  const [selectedSongId, setSelectedSongId] = useState(songCatalog[0].songId);
  const [detailTab, setDetailTab] = useState<DetailTab>("scene-stack");
  const [scrubFrame, setScrubFrame] = useState(0);
  const [songDraft, setSongDraft] = useState(() => getSongById(songCatalog[0].songId));
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof fetchAnalysisArtifact>> | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState("Loading dense analysis...");
  const [selectedLyricLineId, setSelectedLyricLineId] = useState<string | null>(null);
  const [isLyricSelectionPinned, setIsLyricSelectionPinned] = useState(false);
  const [lyricsSaveState, setLyricsSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lyricsSaveMessage, setLyricsSaveMessage] = useState<string | null>(null);
  const [lastSavedLyricsSnapshot, setLastSavedLyricsSnapshot] = useState<string | null>(
    getLyricsSnapshot(getSongById(songCatalog[0].songId).lyrics)
  );
  const selectedSong = getSongById(selectedSongId);
  const resolvedSong = songDraft;

  useEffect(() => {
    let isCancelled = false;
    setSongDraft(selectedSong);
    setAnalysis(null);
    setScrubFrame(0);
    setSelectedLyricLineId(null);
    setIsLyricSelectionPinned(false);
    setLyricsSaveState("idle");
    setLyricsSaveMessage(null);
    setLastSavedLyricsSnapshot(getLyricsSnapshot(selectedSong.lyrics));
    setAnalysisStatus(`Loading dense analysis for ${selectedSong.title}...`);

    fetchAnalysisArtifact(selectedSong.analysisFile)
      .then((loaded) => {
        if (!isCancelled) {
          setAnalysis(loaded);
          setAnalysisStatus("Dense analysis ready.");
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unknown analysis load error.";
        if (!isCancelled) {
          setAnalysisStatus(`Analysis unavailable: ${message}`);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedSong.analysisFile, selectedSong.songId, selectedSong.title]);

  useEffect(() => {
    let isCancelled = false;
    if (!selectedSong.lyricsFile || selectedSong.lyrics) {
      return () => {
        isCancelled = true;
      };
    }

    fetchJsonArtifact<LyricsArtifact>(selectedSong.lyricsFile)
      .then((payload) => {
        if (!isCancelled) {
          setSongDraft((current) => (current.songId === selectedSong.songId ? { ...current, lyrics: payload } : current));
          setLastSavedLyricsSnapshot(getLyricsSnapshot(payload));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSongDraft((current) => (current.songId === selectedSong.songId ? { ...current, lyrics: null } : current));
          setLastSavedLyricsSnapshot(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedSong.lyrics, selectedSong.lyricsFile, selectedSong.songId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !analysis) {
      return;
    }

    const handleFrameUpdate: CallbackListener<"frameupdate"> = ({ detail }) => {
      setScrubFrame(detail.frame);
    };

    setScrubFrame(player.getCurrentFrame());
    player.addEventListener("frameupdate", handleFrameUpdate);

    return () => {
      player.removeEventListener("frameupdate", handleFrameUpdate);
    };
  }, [analysis, selectedSong.songId]);

  const runtime = useMemo(
    () =>
      analysis
        ? getRuntimeState({
            analysis,
            composition: resolvedSong,
            frame: scrubFrame
          })
        : null,
    [analysis, resolvedSong, scrubFrame]
  );

  const fallbackAnalysis = selectedSong.songId === "pulse-demo" ? demoAnalysisMeta : analysis;
  const selectedLineFromRuntime = runtime?.activeLyricLine?.id ?? null;
  const currentLyricsSnapshot = useMemo(() => getLyricsSnapshot(resolvedSong.lyrics), [resolvedSong.lyrics]);
  const lyricsDirty = currentLyricsSnapshot !== lastSavedLyricsSnapshot;
  const canSaveLyrics = Boolean(
    resolvedSong.lyrics &&
      resolvedSong.lyricsSourceFile &&
      resolvedSong.lyricsSourceExport
  );

  useEffect(() => {
    if (!resolvedSong.lyrics?.lines.length) {
      setSelectedLyricLineId(null);
      return;
    }

    setSelectedLyricLineId((current) => {
      if (current && resolvedSong.lyrics?.lines.some((line) => line.id === current)) {
        return current;
      }
      return resolvedSong.lyrics?.lines[0]?.id ?? null;
    });
  }, [resolvedSong.lyrics]);

  useEffect(() => {
    if (isLyricSelectionPinned) {
      return;
    }

    if (selectedLineFromRuntime) {
      setSelectedLyricLineId(selectedLineFromRuntime);
      return;
    }

    setSelectedLyricLineId((current) => {
      if (current && resolvedSong.lyrics?.lines.some((line) => line.id === current)) {
        return current;
      }
      return resolvedSong.lyrics?.lines[0]?.id ?? null;
    });
  }, [isLyricSelectionPinned, resolvedSong.lyrics, selectedLineFromRuntime]);

  const updateLyricsDraft = (nextLyrics: LyricsArtifact) => {
    setSongDraft((current) => ({ ...current, lyrics: nextLyrics }));
    setLyricsSaveState("idle");
    setLyricsSaveMessage(null);
  };

  const handleTimelineLyricSelect = (lineId: string) => {
    setDetailTab("lyrics");
    setIsLyricSelectionPinned(true);
    setSelectedLyricLineId(lineId);
  };

  const handleSaveLyrics = async () => {
    if (!resolvedSong.lyrics || !resolvedSong.lyricsSourceFile || !resolvedSong.lyricsSourceExport) {
      return;
    }

    const snapshotToSave = getLyricsSnapshot(resolvedSong.lyrics);
    setLyricsSaveState("saving");
    setLyricsSaveMessage("Saving lyrics...");

    try {
      const saved = await saveLyrics({
        songId: resolvedSong.songId,
        lyricsSourceFile: resolvedSong.lyricsSourceFile,
        lyricsSourceExport: resolvedSong.lyricsSourceExport,
        lyrics: resolvedSong.lyrics
      });
      setLastSavedLyricsSnapshot(snapshotToSave);
      setLyricsSaveState("saved");
      const savedPath =
        saved.lyrics_source_file ?? saved.source_path ?? saved.artifact_path ?? resolvedSong.lyricsSourceFile;
      setLyricsSaveMessage(`Saved to ${savedPath}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lyrics save failed.";
      setLyricsSaveState("error");
      setLyricsSaveMessage(message);
    }
  };

  const activeSegment = runtime?.activeBookend ?? runtime?.activeScene ?? resolvedSong.bookends?.intro ?? resolvedSong.scenes[0];
  const activeScene = runtime?.activeScene ?? null;
  const songStartSec = fallbackAnalysis ? getSongTimelineStartSec(resolvedSong, fallbackAnalysis) : 0;
  const sceneStartSec = activeScene && fallbackAnalysis ? songStartSec + getBeatTime(fallbackAnalysis, activeScene.startBeat) : 0;
  const sceneEndSec = activeScene && fallbackAnalysis ? songStartSec + getBeatTime(fallbackAnalysis, activeScene.endBeat) : 0;
  const currentTimeSec = runtime?.currentTimeSec ?? 0;
  const analysisDurationSec = analysis?.durationSec ?? 0;
  const totalDurationSec = fallbackAnalysis ? getVideoDurationSec(fallbackAnalysis, resolvedSong) : analysisDurationSec;
  const songAudioClip = fallbackAnalysis ? getTimelineAudioClips(resolvedSong, fallbackAnalysis).find((clip) => clip.kind === "song") ?? null : null;
  const introWindow = fallbackAnalysis ? getBookendWindow(resolvedSong, fallbackAnalysis, "intro") : null;
  const outroWindow = fallbackAnalysis ? getBookendWindow(resolvedSong, fallbackAnalysis, "outro") : null;
  const getRowProgress = (startSec: number, endSec: number): number => {
    if (endSec <= startSec) {
      return currentTimeSec >= endSec ? 100 : 0;
    }

    return Math.max(0, Math.min(100, ((currentTimeSec - startSec) / (endSec - startSec)) * 100));
  };
  const sceneRows = [
    ...(resolvedSong.bookends?.intro
      ? [
          {
            key: `bookend-intro-${resolvedSong.bookends.intro.id}`,
            id: resolvedSong.bookends.intro.id,
            title: resolvedSong.bookends.intro.title,
            subtitle: introWindow ? `${(introWindow.endSec - introWindow.startSec).toFixed(1)}s intro` : `${resolvedSong.bookends.intro.durationSec.toFixed(1)}s intro`,
            startSec: introWindow?.startSec ?? 0,
            endSec: introWindow?.endSec ?? resolvedSong.bookends.intro.durationSec,
            active: runtime?.activeBookend?.id === resolvedSong.bookends.intro.id,
            progress: getRowProgress(introWindow?.startSec ?? 0, introWindow?.endSec ?? resolvedSong.bookends.intro.durationSec)
          }
        ]
      : []),
    ...resolvedSong.scenes.map((scene) => {
      const startSec = scene && fallbackAnalysis ? songStartSec + getBeatTime(fallbackAnalysis, scene.startBeat) : songStartSec;
      const endSec = scene && fallbackAnalysis ? songStartSec + getBeatTime(fallbackAnalysis, scene.endBeat) : startSec;

      return {
        key: `scene-${scene.id}`,
        id: scene.id,
        title: scene.title,
        subtitle: fallbackAnalysis ? `Beats ${scene.startBeat}-${scene.endBeat - 1}` : `Beat range ${scene.startBeat}-${scene.endBeat - 1}`,
        startSec,
        endSec,
        active: scene.id === activeScene?.id,
        progress: getRowProgress(startSec, endSec)
      };
    }),
    ...(resolvedSong.bookends?.outro
      ? [
          {
            key: `bookend-outro-${resolvedSong.bookends.outro.id}`,
            id: resolvedSong.bookends.outro.id,
            title: resolvedSong.bookends.outro.title,
            subtitle: outroWindow ? `${(outroWindow.endSec - outroWindow.startSec).toFixed(1)}s outro` : `${resolvedSong.bookends.outro.durationSec.toFixed(1)}s outro`,
            startSec: outroWindow?.startSec ?? songStartSec + analysisDurationSec,
            endSec: outroWindow?.endSec ?? totalDurationSec,
            active: runtime?.activeBookend?.id === resolvedSong.bookends.outro.id,
            progress: getRowProgress(outroWindow?.startSec ?? songStartSec + analysisDurationSec, outroWindow?.endSec ?? totalDurationSec)
          }
        ]
      : [])
  ];
  const durationInFrames = analysis ? Math.ceil(getVideoDurationSec(analysis, resolvedSong) * resolvedSong.fps) : 1;

  return (
    <main className="studio-shell">
      <section className="masthead">
        <div>
          <p className="eyebrow">Beat-Snapped Music Video Studio</p>
        </div>
        <div className="masthead-copy" style={{ display: "grid", gap: "0.75rem" }}>
          <label className="song-select">
            <span>Song</span>
            <select value={selectedSongId} onChange={(event) => setSelectedSongId(event.target.value)}>
              {songCatalog.map((song) => (
                <option key={song.songId} value={song.songId}>
                  {song.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="studio-grid">
        <div className="preview-column">
          {analysis ? (
            <PreviewPlayer ref={playerRef} analysis={analysis} durationInFrames={durationInFrames} song={resolvedSong} />
          ) : (
            <div className="detail-block detail-block--hero" style={{ minHeight: 320 }}>
              <p className="eyebrow">Dense Analysis</p>
              <h2>Preparing preview signals</h2>
              <p>{analysisStatus}</p>
            </div>
          )}
          <TimelineDebug
            analysis={fallbackAnalysis ?? demoAnalysisMeta}
            composition={resolvedSong}
            currentBeat={runtime?.currentBeat ?? 0}
            currentTimeSec={runtime?.currentTimeSec ?? 0}
            activeSceneId={activeScene?.id ?? null}
            activeBookendId={runtime?.activeBookend?.id ?? null}
            activeAudioClipId={songAudioClip?.id ?? null}
            activeLyricLineId={runtime?.activeLyricLine?.id ?? null}
            activeLyricWordText={runtime?.activeLyricWord?.text ?? null}
            selectedLyricLineId={selectedLyricLineId}
            onBookendsChange={(nextBookends) => setSongDraft((current) => ({ ...current, bookends: nextBookends }))}
            onAudioClipsChange={(nextAudioClips) => setSongDraft((current) => ({ ...current, audioClips: nextAudioClips }))}
            onScenesChange={(nextScenes) => setSongDraft((current) => ({ ...current, scenes: nextScenes }))}
            onLyricsChange={updateLyricsDraft}
            onLyricLineSelect={handleTimelineLyricSelect}
          />
        </div>

        <aside className="detail-column detail-column--tabs">
          <div className="pane-tabs" role="tablist" aria-label="Right pane sections">
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === "scene-stack"}
              className={`pane-tab ${detailTab === "scene-stack" ? "is-active" : ""}`}
              onClick={() => setDetailTab("scene-stack")}
            >
              Scene Stack
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === "drivers"}
              className={`pane-tab ${detailTab === "drivers" ? "is-active" : ""}`}
              onClick={() => setDetailTab("drivers")}
            >
              Live Drivers
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === "lyrics"}
              className={`pane-tab ${detailTab === "lyrics" ? "is-active" : ""}`}
              onClick={() => setDetailTab("lyrics")}
            >
              Lyrics
            </button>
          </div>

          {detailTab === "scene-stack" ? (
            <>
              <section className="detail-block detail-block--hero">
                <p className="eyebrow">Active Segment</p>
                <h2>{activeSegment.title}</h2>
                <p>{activeSegment.notes}</p>
                <div className="scene-window">
                  <span>{runtime?.activeSegmentType ?? "song"}</span>
                  <span>
                    {activeScene
                      ? `${sceneStartSec.toFixed(2)}s - ${sceneEndSec.toFixed(2)}s`
                      : `${runtime?.sceneProgress ? Math.round(runtime.sceneProgress * 100) : 0}%`}
                  </span>
                </div>
              </section>

              <section className="detail-block">
                <p className="eyebrow">Scene Stack</p>
                <ul className="scene-list">
                  {sceneRows.map((row) => (
                    <li
                      key={row.key}
                      className={row.active ? "is-active" : ""}
                      style={{ ["--scene-progress" as string]: `${row.progress}%` }}
                    >
                      <strong>{row.title}</strong>
                      <span>{row.subtitle}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : detailTab === "drivers" ? (
            <section className="detail-block">
              <p className="eyebrow">Live Drivers</p>
              <dl className="meter-grid">
                <div>
                  <dt>Scene</dt>
                  <dd>{formatPercent(runtime?.sceneProgress)}</dd>
                </div>
                <div>
                  <dt>Song</dt>
                  <dd>{formatPercent(runtime?.songProgress)}</dd>
                </div>
                <div>
                  <dt>Beat Pulse</dt>
                  <dd>{formatPercent(runtime?.beatPulse)}</dd>
                </div>
                <div>
                  <dt>Bass</dt>
                  <dd>{formatPercent(runtime?.bands.bass)}</dd>
                </div>
                <div>
                  <dt>Mids</dt>
                  <dd>{formatPercent(runtime?.bands.mid)}</dd>
                </div>
                <div>
                  <dt>Highs</dt>
                  <dd>{formatPercent(runtime?.bands.high)}</dd>
                </div>
                <div>
                  <dt>Loudness</dt>
                  <dd>{formatPercent(runtime?.loudness)}</dd>
                </div>
              </dl>
            </section>
          ) : (
            <>
              <section className="detail-block">
                <p className="eyebrow">Lyric Sync</p>
                <p className="prompt-copy">{runtime?.activeLyricLine?.text ?? "No active lyric line at this moment."}</p>
                <p className="status-copy">
                  Active word: {runtime?.activeLyricWord?.text ?? "none"} | Song time:{" "}
                  {runtime?.songTimeSec == null ? "--" : `${runtime.songTimeSec.toFixed(2)}s`}
                </p>
              </section>

              <LyricsEditorPanel
                analysis={fallbackAnalysis ?? null}
                activeLineId={runtime?.activeLyricLine?.id ?? null}
                selectedLineId={selectedLyricLineId}
                lyrics={resolvedSong.lyrics ?? null}
                onLyricsChange={updateLyricsDraft}
                canSaveLyrics={canSaveLyrics}
                lyricsDirty={lyricsDirty}
                lyricsSaveState={lyricsSaveState}
                lyricsSaveMessage={lyricsSaveMessage}
                onSaveLyrics={handleSaveLyrics}
              />
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
