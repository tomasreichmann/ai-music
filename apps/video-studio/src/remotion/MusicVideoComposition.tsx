import { AbsoluteFill, Audio, Sequence, useCurrentFrame } from "remotion";

import { getRuntimeState } from "../lib/runtime";
import { getTimelineAudioClips } from "../lib/timeline-arrangement";
import type { LoadedSongAnalysisArtifact, LyricLineCue, VisualSegmentSpec, SongComposition } from "../lib/types";
import { GenericScene } from "./scenes/GenericScene";
import { SceneLyrics, assetPath, getSegmentFilter, getSegmentTransform, resolveActiveWordText } from "./scenes/shared";

const resolveActiveSegment = (runtime: ReturnType<typeof getRuntimeState>, song: SongComposition): VisualSegmentSpec =>
  runtime.activeBookend ?? runtime.activeScene ?? song.scenes[0];

const resolveNextLyricLine = (song: SongComposition, activeLine: LyricLineCue | null): LyricLineCue | null => {
  if (!activeLine || !song.lyrics?.lines.length) {
    return null;
  }

  const index = song.lyrics.lines.findIndex((line) => line.id === activeLine.id);
  return song.lyrics.lines[index + 1] ?? null;
};

export const MusicVideoComposition = ({
  song,
  analysis,
  showSceneDebug = false
}: {
  song: SongComposition;
  analysis?: LoadedSongAnalysisArtifact;
  showSceneDebug?: boolean;
}) => {
  if (!analysis) {
    return <AbsoluteFill className="composition-shell" />;
  }

  const frame = useCurrentFrame();
  const runtime = getRuntimeState({
    analysis,
    composition: song,
    frame
  });
  const activeSegment = resolveActiveSegment(runtime, song);
  const activeScene = runtime.activeScene;
  const activeBookend = runtime.activeBookend;
  const ActiveSceneComponent = activeScene?.component ?? null;
  const ActiveBookendComponent = activeBookend?.component ?? null;
  const sceneFilter = getSegmentFilter(activeSegment.effects, runtime);
  const sceneTransform = getSegmentTransform(activeSegment, runtime);
  const audioClips = getTimelineAudioClips(song, analysis);
  const nextLyricLine = resolveNextLyricLine(song, runtime.activeLyricLine);
  const lyricsOverlay = activeSegment.lyricsOverlay;

  return (
    <AbsoluteFill className="composition-shell">
      <AbsoluteFill
        className="composition-stage"
        style={{
          filter: sceneFilter,
          transform: sceneTransform,
          transformOrigin: activeSegment.transformOrigin ?? "center"
        }}
      >
        {ActiveSceneComponent && activeScene ? (
          <ActiveSceneComponent
            scene={activeScene}
            song={song}
            analysis={analysis}
            runtime={runtime}
            activeLyricLine={runtime.activeLyricLine}
            activeLyricWord={runtime.activeLyricWord}
            nextLyricLine={nextLyricLine}
          />
        ) : ActiveBookendComponent && activeBookend ? (
          <ActiveBookendComponent bookend={activeBookend} song={song} analysis={analysis} runtime={runtime} />
        ) : (
          <GenericScene segment={activeSegment} runtime={runtime} />
        )}
      </AbsoluteFill>
      {runtime.activeSegmentType === "song" ? (
        <SceneLyrics
          line={runtime.activeLyricLine}
          nextLine={nextLyricLine}
          activeWordText={resolveActiveWordText(runtime.activeLyricWord)}
          className={lyricsOverlay?.className ?? "lyric-caption"}
          backdropClassName={lyricsOverlay?.backdropClassName}
        />
      ) : null}
      {showSceneDebug ? (
        <AbsoluteFill className="composition-debug">
          <small>{runtime.activeSegmentType}</small>
          <span>{activeSegment.title}</span>
        </AbsoluteFill>
      ) : null}
      {audioClips.map((clip) => {
        const startFrames = Math.round(clip.startSec * song.fps);
        const clipFrames = Math.max(
          1,
          Math.round((clip.endSec ?? clip.startSec + (clip.durationSec ?? analysis.durationSec)) * song.fps) - startFrames
        );

        return (
          <Sequence key={clip.id} from={startFrames} durationInFrames={clipFrames}>
            <Audio src={assetPath(clip.audioFile)} volume={clip.audioVolume ?? 1} />
          </Sequence>
        );
      })}
      {song.bookends?.intro?.audioFile ? (
        <Sequence from={0} durationInFrames={Math.round(song.bookends.intro.durationSec * song.fps)}>
          <Audio src={assetPath(song.bookends.intro.audioFile)} volume={song.bookends.intro.audioVolume ?? 1} />
        </Sequence>
      ) : null}
      {song.bookends?.outro?.audioFile ? (
        <Sequence
          from={Math.round((song.bookends.outro.startSec ?? runtime.videoDurationSec - song.bookends.outro.durationSec) * song.fps)}
          durationInFrames={Math.round(song.bookends.outro.durationSec * song.fps)}
        >
          <Audio src={assetPath(song.bookends.outro.audioFile)} volume={song.bookends.outro.audioVolume ?? 1} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
