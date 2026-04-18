import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from "react";

import { getVideoDurationSec } from "../lib/runtime";
import {
  adjustAudioClipBoundary,
  adjustBookendBoundary,
  adjustLyricLineBoundary,
  adjustLyricWordBoundary,
  adjustSceneBoundary,
  getLyricLineWindow
} from "../lib/timeline-editing";
import {
  getAudioClipWindow,
  getBookendWindow,
  getSceneWindow,
  getSongTimelineStartSec,
  getTimelineAudioClips
} from "../lib/timeline-arrangement";
import { getBeatAtTime, getBeatTime } from "../lib/timing";
import type { AudioClipSpec, LyricsArtifact, SceneSpec, SongAnalysisArtifact, SongComposition } from "../lib/types";

const LABEL_COLUMN_WIDTH = 168;
const BASE_PX_PER_SECOND = 12;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 20;
const ZOOM_STEP = 0.25;
const WORD_ZOOM_THRESHOLD = 10;

type DragTarget =
  | {
      kind: "scene";
      edge: "start" | "end";
      sceneIndex: number;
      snapshot: SongComposition;
    }
  | {
      kind: "bookend";
      edge: "start" | "end";
      bookend: "intro" | "outro";
      snapshot: SongComposition;
    }
  | {
      kind: "audio";
      edge: "start" | "end";
      clipIndex: number;
      snapshot: SongComposition;
    }
  | {
      kind: "line";
      edge: "start" | "end";
      lineId: string;
      snapshot: LyricsArtifact;
    }
  | {
      kind: "word";
      edge: "start" | "end";
      lineId: string;
      wordIndex: number;
      snapshot: LyricsArtifact;
    };

type DragModifierSource = {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  getModifierState?: (key: string) => boolean;
};

type DragModifiers = {
  shiftKey: boolean;
  ctrlKey: boolean;
};

type TimelinePanelProps = {
  analysis: SongAnalysisArtifact;
  composition: SongComposition;
  currentBeat: number;
  currentTimeSec: number;
  activeSceneId: string | null;
  activeBookendId?: string | null;
  activeAudioClipId?: string | null;
  activeLyricLineId?: string | null;
  selectedLyricLineId?: string | null;
  activeLyricWordText?: string | null;
  onLyricLineSelect?: (lineId: string) => void;
  onBookendsChange?: (nextBookends: SongComposition["bookends"]) => void;
  onAudioClipsChange?: (nextAudioClips: AudioClipSpec[] | undefined) => void;
  onLyricsChange?: (nextLyrics: LyricsArtifact) => void;
  onScenesChange?: (nextScenes: SceneSpec[]) => void;
};

type BookendSegment = NonNullable<NonNullable<SongComposition["bookends"]>["intro"]>;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeText = (value: string | null | undefined): string | null =>
  value ? value.replace(/[^\w']/g, "").toLowerCase() : null;

const formatZoom = (value: number): string => `${Math.round(value * 100)}%`;

type TimelineItemProps = {
  active?: boolean;
  className?: string;
  left: number;
  width: number;
  title: string;
  subtitle?: string;
  showStartHandle?: boolean;
  showEndHandle?: boolean;
  startHandleLabel?: string;
  endHandleLabel?: string;
  titleAttribute?: string;
  interactive?: boolean;
  onClick?: () => void;
  onStartHandlePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onEndHandlePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
};

const TimelineItem = ({
  active = false,
  className = "",
  left,
  width,
  title,
  subtitle,
  showStartHandle = false,
  showEndHandle = false,
  startHandleLabel,
  endHandleLabel,
  titleAttribute,
  interactive = false,
  onClick,
  onStartHandlePointerDown,
  onEndHandlePointerDown,
  children
}: TimelineItemProps) => {
  const edgeHandleWidth = Math.min(16, width / 2);
  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!onClick) {
      return;
    }

    event.stopPropagation();
    onClick();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    }
  };

  return (
    <article
      className={`timeline-segment ${className} ${active ? "is-active" : ""} ${interactive ? "is-interactive" : ""}`.trim()}
      style={{ left: `${left}px`, width: `${width}px` }}
      title={titleAttribute}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? titleAttribute ?? title : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {showStartHandle && onStartHandlePointerDown ? (
        <button
          type="button"
          className="timeline-edge-handle timeline-edge-handle--start"
          aria-label={startHandleLabel ?? `Resize ${title} start`}
          style={{ left: 0, width: `${edgeHandleWidth}px` }}
          onPointerDown={onStartHandlePointerDown}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
      {showEndHandle && onEndHandlePointerDown ? (
        <button
          type="button"
          className="timeline-edge-handle timeline-edge-handle--end"
          aria-label={endHandleLabel ?? `Resize ${title} end`}
          style={{ right: 0, width: `${edgeHandleWidth}px` }}
          onPointerDown={onEndHandlePointerDown}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
      <strong>{title}</strong>
      {subtitle ? <span>{subtitle}</span> : null}
      {children}
    </article>
  );
};

export const getTimelineDragModifiers = (event: DragModifierSource, fallback: DragModifiers = { shiftKey: false, ctrlKey: false }): DragModifiers => {
  const shiftKey = Boolean(event.shiftKey || event.getModifierState?.("Shift") || fallback.shiftKey);
  const ctrlKey = Boolean(event.ctrlKey || event.getModifierState?.("Control") || fallback.ctrlKey);

  return { shiftKey, ctrlKey };
};

export const TimelinePanel = ({
  analysis,
  composition,
  currentBeat,
  currentTimeSec,
  activeSceneId,
  activeBookendId = null,
  activeAudioClipId = null,
  activeLyricLineId = null,
  selectedLyricLineId = null,
  activeLyricWordText = null,
  onLyricLineSelect,
  onBookendsChange,
  onAudioClipsChange,
  onLyricsChange,
  onScenesChange
}: TimelinePanelProps) => {
  const [zoom, setZoom] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const dragTargetRef = useRef<DragTarget | null>(null);

  useEffect(
    () => () => {
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
      dragTargetRef.current = null;
    },
    []
  );

  const songStartSec = getSongTimelineStartSec(composition, analysis);
  const audioClips = getTimelineAudioClips(composition, analysis);
  const totalDurationSec = getVideoDurationSec(analysis, composition);
  const pxPerSecond = BASE_PX_PER_SECOND * zoom;
  const timelineWidth = Math.max(1000, totalDurationSec * pxPerSecond);
  const wordRowsEnabled = zoom >= WORD_ZOOM_THRESHOLD;
  const showBeatLabels = zoom < 5;
  const lyrics = composition.lyrics;

  const timeToLeft = (timeSec: number): number => timeSec * pxPerSecond;
  const beatToLeft = (beatValue: number): number => timeToLeft(songStartSec + getBeatTime(analysis, beatValue));
  const getTimeFromClientX = (clientX: number): number | null => {
    const content = contentRef.current;
    if (!content) {
      return null;
    }

    const rect = content.getBoundingClientRect();
    const x = clientX - rect.left - LABEL_COLUMN_WIDTH;
    if (x < 0) {
      return 0;
    }

    return Math.max(0, x / pxPerSecond);
  };
  const getBeatFromClientX = (clientX: number): number | null => {
    const timeSec = getTimeFromClientX(clientX);
    if (timeSec == null) {
      return null;
    }

    return getBeatAtTime(analysis, Math.max(0, timeSec - songStartSec));
  };

  const stopDrag = () => {
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
    dragTargetRef.current = null;
  };

  const beginDrag = (target: DragTarget, event: DragModifierSource & { clientX: number; preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();

    const hasCallback =
      (target.kind === "scene" && Boolean(onScenesChange)) ||
      (target.kind === "bookend" && Boolean(onBookendsChange)) ||
      (target.kind === "audio" && Boolean(onAudioClipsChange)) ||
      (target.kind === "line" && Boolean(onLyricsChange)) ||
      (target.kind === "word" && Boolean(onLyricsChange));
    if (!hasCallback) {
      return;
    }

    dragTargetRef.current = target;
    let modifierState = getTimelineDragModifiers(event);

    const handleMove = (moveEvent: PointerEvent) => {
      const dragTarget = dragTargetRef.current;
      if (!dragTarget) {
        return;
      }
      const beat = getBeatFromClientX(moveEvent.clientX);
      if (beat == null) {
        return;
      }
      const timeSec = getTimeFromClientX(moveEvent.clientX);
      if (timeSec == null) {
        return;
      }

      modifierState = getTimelineDragModifiers(moveEvent, modifierState);
      const options = {
        shiftKey: modifierState.shiftKey,
        snapEnabled: !modifierState.ctrlKey
      };

      if (dragTarget.kind === "scene" && onScenesChange) {
        onScenesChange(adjustSceneBoundary(dragTarget.snapshot.scenes, dragTarget.sceneIndex, dragTarget.edge, beat, options));
      }

      if (dragTarget.kind === "bookend" && onBookendsChange) {
        onBookendsChange(
          adjustBookendBoundary(dragTarget.snapshot, analysis, dragTarget.bookend, dragTarget.edge, timeSec, options).bookends
        );
      }

      if (dragTarget.kind === "audio" && onAudioClipsChange) {
        const nextClips = dragTarget.snapshot.audioClips ?? audioClips;
        const currentClip = nextClips[dragTarget.clipIndex];
        if (!currentClip) {
          return;
        }
        const nextClip = adjustAudioClipBoundary(currentClip, dragTarget.edge, timeSec, options);
        onAudioClipsChange(nextClips.map((clip, index) => (index === dragTarget.clipIndex ? nextClip : clip)));
      }

      if (dragTarget.kind === "line" && onLyricsChange) {
        onLyricsChange(adjustLyricLineBoundary(dragTarget.snapshot, dragTarget.lineId, dragTarget.edge, beat, options));
      }

      if (dragTarget.kind === "word" && onLyricsChange) {
        onLyricsChange(adjustLyricWordBoundary(dragTarget.snapshot, dragTarget.lineId, dragTarget.wordIndex, dragTarget.edge, beat, options));
      }
    };

    const handleKey = (keyboardEvent: KeyboardEvent) => {
      modifierState = getTimelineDragModifiers(keyboardEvent, modifierState);
    };

    const handleUp = () => {
      stopDrag();
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleUp, { once: true });
    dragCleanupRef.current = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      dragTargetRef.current = null;
    };
  };

  const changeZoom = (delta: number) => setZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM));

  const handleWheel = (event: { ctrlKey: boolean; deltaY: number; preventDefault: () => void }) => {
    if (!event.ctrlKey) {
      return;
    }
    event.preventDefault();
    changeZoom(event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
  };

  const renderSceneSegment = (
    scene: SceneSpec | BookendSegment,
    sceneIndex: number,
    startSec: number,
    endSec: number,
    variant: "bookend" | "scene",
    bookendKind?: "intro" | "outro"
  ) => {
    const left = timeToLeft(startSec);
    const width = Math.max(timeToLeft(endSec) - left, 8);
    const isActive = variant === "scene" ? activeSceneId === scene.id : activeBookendId === scene.id;
    const showStartHandle = variant === "scene" ? Boolean(onScenesChange) : Boolean(onBookendsChange);
    const showEndHandle = variant === "scene" ? Boolean(onScenesChange) : Boolean(onBookendsChange);

    return (
      <TimelineItem
        key={`${variant}-${scene.id}`}
        className={`timeline-segment--${variant}`}
        active={isActive}
        left={left}
        width={width}
        title={scene.title}
        subtitle={variant === "bookend" ? `${(endSec - startSec).toFixed(2)}s` : `Beats ${scene.startBeat}-${scene.endBeat}`}
        showStartHandle={showStartHandle}
        showEndHandle={showEndHandle}
        onStartHandlePointerDown={(event) =>
          beginDrag(
            variant === "scene"
              ? { kind: "scene", edge: "start", sceneIndex, snapshot: composition }
              : { kind: "bookend", edge: "start", bookend: bookendKind ?? "outro", snapshot: composition },
            event
          )
        }
        onEndHandlePointerDown={(event) =>
          beginDrag(
            variant === "scene"
              ? { kind: "scene", edge: "end", sceneIndex, snapshot: composition }
              : { kind: "bookend", edge: "end", bookend: bookendKind ?? "outro", snapshot: composition },
            event
          )
        }
      />
    );
  };

  const renderWordSegment = (
    lineId: string,
    wordIndex: number,
    word: NonNullable<NonNullable<LyricsArtifact["lines"][number]["words"]>[number]>,
    lineText: string,
    lineWindowLeft: number
  ) => {
    if (typeof word.startBeat !== "number" || typeof word.endBeat !== "number") {
      return null;
    }

    const left = beatToLeft(word.startBeat) - lineWindowLeft;
    const width = Math.max(beatToLeft(word.endBeat) - beatToLeft(word.startBeat), 8);
    const isActiveWord = normalizeText(word.text) === normalizeText(activeLyricWordText);

    return (
      <TimelineItem
        key={`${word.text}-${wordIndex}`}
        className={`timeline-word ${isActiveWord ? "is-active" : ""}`}
        left={left}
        width={width}
        title={word.text}
        titleAttribute={word.text}
        interactive={Boolean(onLyricLineSelect)}
        onClick={() => onLyricLineSelect?.(lineId)}
        showStartHandle={Boolean(onLyricsChange)}
        showEndHandle={Boolean(onLyricsChange)}
        startHandleLabel={`Resize ${lineText} ${word.text} start`}
        endHandleLabel={`Resize ${lineText} ${word.text} end`}
        onStartHandlePointerDown={(event) =>
          beginDrag(
            {
              kind: "word",
              edge: "start",
              lineId,
              wordIndex,
              snapshot: lyrics as LyricsArtifact
            },
            event
          )
        }
        onEndHandlePointerDown={(event) =>
          beginDrag(
            {
              kind: "word",
              edge: "end",
              lineId,
              wordIndex,
              snapshot: lyrics as LyricsArtifact
            },
            event
          )
        }
      />
    );
  };

  const renderLineSegments = () => {
    const lines = lyrics?.lines ?? [];
    if (!lines.length) {
      return null;
    }

    return (
      <div className="timeline-row timeline-row--lyrics">
        <div className="timeline-row-label">
          <strong>Lyrics</strong>
          <span>{lines.length} lines</span>
          <small>{wordRowsEnabled ? "Word detail" : "Line windows"}</small>
        </div>
        <div className="timeline-row-lane" style={{ width: `${timelineWidth}px` }}>
          {lines.map((line, lineIndex) => {
            const window = getLyricLineWindow(line);
            if (!window) {
              return null;
            }

            const lineStartLeft = beatToLeft(window.startBeat);
            const lineEndLeft = beatToLeft(window.endBeat);
            const left = lineStartLeft;
            const width = Math.max(lineEndLeft - left, 8);
            const isActiveLine = activeLyricLineId === line.id;
            const isSelectedLine = selectedLyricLineId === line.id;
            const lineLabel = `${lineIndex + 1}: ${line.text}`;
            const lineHandleLabel = `line ${lineIndex + 1}`;

            return (
              <TimelineItem
                key={line.id}
                className={`timeline-line-window ${isSelectedLine ? "timeline-line-window--selected" : ""}`}
                active={isActiveLine || isSelectedLine}
                left={left}
                width={width}
                title={lineLabel}
                subtitle={`${window.startBeat.toFixed(2)} - ${window.endBeat.toFixed(2)} beats`}
                titleAttribute={lineLabel}
                interactive={Boolean(onLyricLineSelect)}
                onClick={() => onLyricLineSelect?.(line.id)}
                showStartHandle={Boolean(onLyricsChange)}
                showEndHandle={Boolean(onLyricsChange)}
                startHandleLabel={`Resize ${lineHandleLabel} start`}
                endHandleLabel={`Resize ${lineHandleLabel} end`}
                onStartHandlePointerDown={(event) =>
                  beginDrag({ kind: "line", edge: "start", lineId: line.id, snapshot: lyrics as LyricsArtifact }, event)
                }
                onEndHandlePointerDown={(event) =>
                  beginDrag({ kind: "line", edge: "end", lineId: line.id, snapshot: lyrics as LyricsArtifact }, event)
                }
              >
                {wordRowsEnabled && line.words?.length ? line.words.map((word, wordIndex) => renderWordSegment(line.id, wordIndex, word, line.text, lineStartLeft)) : null}
              </TimelineItem>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSceneTrack = () => {
    const intro = composition.bookends?.intro;
    const outro = composition.bookends?.outro;
    const introWindow = intro ? getBookendWindow(composition, analysis, "intro") : null;
    const outroWindow = outro ? getBookendWindow(composition, analysis, "outro") : null;

    return (
      <div className="timeline-row timeline-row--scenes">
        <div className="timeline-row-label">
          <strong>Scenes</strong>
          <span>{composition.scenes.length} sections</span>
          <small>{formatZoom(zoom)}</small>
        </div>
        <div className="timeline-row-lane" style={{ width: `${timelineWidth}px` }}>
          {intro && introWindow ? renderSceneSegment(intro, -1, introWindow.startSec, introWindow.endSec, "bookend", "intro") : null}
          {composition.scenes.map((scene, sceneIndex) => {
            const window = getSceneWindow(scene, analysis, songStartSec);
            return renderSceneSegment(scene, sceneIndex, window.startSec, window.endSec, "scene");
          })}
          {outro && outroWindow ? renderSceneSegment(outro, -1, outroWindow.startSec, outroWindow.endSec, "bookend", "outro") : null}
        </div>
      </div>
    );
  };

  const renderAudioRows = () =>
    audioClips.map((clip, clipIndex) => {
      const window = getAudioClipWindow(clip, analysis);
      const left = timeToLeft(window.startSec);
      const width = Math.max(timeToLeft(window.endSec) - left, 8);
      const isActiveClip =
        activeAudioClipId != null
          ? activeAudioClipId === clip.id
          : currentTimeSec >= window.startSec && currentTimeSec < window.endSec;

      return (
        <div key={clip.id} className={`timeline-row timeline-row--audio ${isActiveClip ? "is-active" : ""}`}>
          <div className="timeline-row-label">
            <strong>{clip.title}</strong>
            <span>{clip.kind === "song" ? "Master song" : `Track ${clipIndex + 1}`}</span>
            <small>
              {window.startSec.toFixed(2)}s - {window.endSec.toFixed(2)}s
            </small>
          </div>
          <div className="timeline-row-lane" style={{ width: `${timelineWidth}px` }}>
            <TimelineItem
              className="timeline-segment--audio"
              active={isActiveClip}
              left={left}
              width={width}
              title={clip.title}
              subtitle={`${window.startSec.toFixed(2)}s - ${window.endSec.toFixed(2)}s`}
              showStartHandle={Boolean(onAudioClipsChange)}
              showEndHandle={Boolean(onAudioClipsChange)}
              onStartHandlePointerDown={(event) =>
                beginDrag({ kind: "audio", edge: "start", clipIndex, snapshot: composition }, event)
              }
              onEndHandlePointerDown={(event) =>
                beginDrag({ kind: "audio", edge: "end", clipIndex, snapshot: composition }, event)
              }
            />
          </div>
        </div>
      );
    });

  const playheadLeft = timeToLeft(currentTimeSec);
  const timelineStyle: CSSProperties = {
    "--timeline-label-width": `${LABEL_COLUMN_WIDTH}px`
  };

  return (
    <section className="timeline-panel" aria-label="Timeline">
      <header className="timeline-header">
        <div className="timeline-header-stack">
          <p className="eyebrow">Timeline</p>
          <div className="timeline-toolbar" aria-label="Timeline zoom controls">
            <button type="button" className="timeline-zoom-button" aria-label="Zoom out" onClick={() => changeZoom(-ZOOM_STEP)}>
              -
            </button>
            <span>{formatZoom(zoom)}</span>
            <button type="button" className="timeline-zoom-button" aria-label="Zoom in" onClick={() => changeZoom(ZOOM_STEP)}>
              +
            </button>
          </div>
        </div>
        <div className="timeline-meta">
          <span>Beat {currentBeat}</span>
          <span>{currentTimeSec.toFixed(2)}s</span>
        </div>
      </header>

      <div className="timeline-scroll" onWheel={handleWheel}>
        <div className="timeline-content" ref={contentRef} style={timelineStyle}>
          <div
            className="timeline-ruler"
            style={{ width: `${timelineWidth}px`, marginLeft: `${LABEL_COLUMN_WIDTH}px` }}
            aria-hidden="true"
          >
          {analysis.beats.map((marker) => {
            const left = timeToLeft(songStartSec + marker.timeSec);
            const showLabel = showBeatLabels || marker.isDownbeat;
            return (
              <span key={marker.index} className={`timeline-ruler-marker ${marker.isDownbeat ? "is-downbeat" : ""}`} style={{ left: `${left}px` }}>
                {showLabel ? <span className="timeline-ruler-marker-label">{marker.index}</span> : null}
              </span>
            );
          })}
          </div>

          {renderSceneTrack()}
          {renderAudioRows()}
          {renderLineSegments()}

          <span className="timeline-playhead" style={{ left: `${LABEL_COLUMN_WIDTH + playheadLeft}px` }} />
        </div>
      </div>
    </section>
  );
};
