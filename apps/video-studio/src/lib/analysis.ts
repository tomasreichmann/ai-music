import type { LoadedSongAnalysisArtifact, RuntimeBands, SongAnalysisArtifact } from "./types";
import { resolveMediaUrl } from "./bridge";

export const ENVELOPE_CHANNELS = ["sub", "bass", "lowMid", "mid", "highMid", "high", "rms"] as const;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const readByte = (analysis: LoadedSongAnalysisArtifact, frameIndex: number, channelIndex: number): number => {
  const offset = frameIndex * ENVELOPE_CHANNELS.length + channelIndex;
  return (analysis.envelopeBytes[offset] ?? 0) / 255;
};

const readFrame = (
  analysis: LoadedSongAnalysisArtifact,
  frameIndex: number
): { bands: RuntimeBands; loudness: number } => {
  const safeIndex = clamp(frameIndex, 0, analysis.envelopes.frameCount - 1);
  return {
    bands: {
      sub: readByte(analysis, safeIndex, 0),
      bass: readByte(analysis, safeIndex, 1),
      lowMid: readByte(analysis, safeIndex, 2),
      mid: readByte(analysis, safeIndex, 3),
      highMid: readByte(analysis, safeIndex, 4),
      high: readByte(analysis, safeIndex, 5)
    },
    loudness: readByte(analysis, safeIndex, 6)
  };
};

const interpolate = (left: number, right: number, progress: number): number => left + (right - left) * progress;

export const hydrateAnalysisArtifact = (
  analysis: SongAnalysisArtifact,
  envelopeBytes: Uint8Array
): LoadedSongAnalysisArtifact => {
  const expectedChannels = ENVELOPE_CHANNELS.join("|");
  const actualChannels = analysis.envelopes.channels.join("|");
  if (analysis.envelopes.format !== "uint8-interleaved-v1") {
    throw new Error(`Unsupported envelope format: ${analysis.envelopes.format}`);
  }
  if (actualChannels !== expectedChannels) {
    throw new Error(`Unsupported envelope channel order: ${actualChannels}`);
  }

  const expectedByteCount = analysis.envelopes.frameCount * analysis.envelopes.channels.length;
  if (envelopeBytes.length !== expectedByteCount) {
    throw new Error(`Expected ${expectedByteCount} bytes, received ${envelopeBytes.length}.`);
  }

  return {
    ...analysis,
    envelopeBytes
  };
};

export const sampleEnvelopeAtTime = (
  analysis: LoadedSongAnalysisArtifact,
  timeSec: number,
  compositionFps: number
): { bands: RuntimeBands; loudness: number } => {
  if (analysis.envelopes.frameCount <= 1) {
    return readFrame(analysis, 0);
  }

  const framePosition = clamp(timeSec * analysis.envelopes.fps, 0, analysis.envelopes.frameCount - 1);
  const leftIndex = Math.floor(framePosition);

  if (compositionFps === analysis.envelopes.fps) {
    return readFrame(analysis, leftIndex);
  }

  const rightIndex = Math.min(leftIndex + 1, analysis.envelopes.frameCount - 1);
  if (leftIndex === rightIndex) {
    return readFrame(analysis, leftIndex);
  }

  const left = readFrame(analysis, leftIndex);
  const right = readFrame(analysis, rightIndex);
  const progress = framePosition - leftIndex;

  return {
    bands: {
      sub: interpolate(left.bands.sub, right.bands.sub, progress),
      bass: interpolate(left.bands.bass, right.bands.bass, progress),
      lowMid: interpolate(left.bands.lowMid, right.bands.lowMid, progress),
      mid: interpolate(left.bands.mid, right.bands.mid, progress),
      highMid: interpolate(left.bands.highMid, right.bands.highMid, progress),
      high: interpolate(left.bands.high, right.bands.high, progress)
    },
    loudness: interpolate(left.loudness, right.loudness, progress)
  };
};

export const fetchAnalysisArtifact = async (analysisUrl: string): Promise<LoadedSongAnalysisArtifact> => {
  const metadataResponse = await fetch(resolveMediaUrl(analysisUrl));
  if (!metadataResponse.ok) {
    throw new Error(`Analysis metadata request failed with ${metadataResponse.status}.`);
  }

  const metadata = (await metadataResponse.json()) as SongAnalysisArtifact;
  const bytesResponse = await fetch(resolveMediaUrl(metadata.envelopes.binaryPath));
  if (!bytesResponse.ok) {
    throw new Error(`Envelope binary request failed with ${bytesResponse.status}.`);
  }

  const envelopeBytes = new Uint8Array(await bytesResponse.arrayBuffer());
  return hydrateAnalysisArtifact(metadata, envelopeBytes);
};

export const fetchJsonArtifact = async <T>(artifactUrl: string): Promise<T> => {
  const response = await fetch(resolveMediaUrl(artifactUrl));
  if (!response.ok) {
    throw new Error(`Artifact request failed with ${response.status}.`);
  }
  return (await response.json()) as T;
};
