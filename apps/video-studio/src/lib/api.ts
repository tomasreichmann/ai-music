import type { LyricsArtifact } from "./types";

export interface GenerateSceneImagePayload {
  songId: string;
  sceneId: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  provider?: string;
}

export interface GenerateSceneImageResult {
  song_id: string;
  scene_id: string;
  provider: string;
  metadata_path: string;
}

export interface SaveLyricsPayload {
  songId: string;
  lyricsSourceFile: string;
  lyricsSourceExport: string;
  lyrics: LyricsArtifact;
}

export interface SaveLyricsResult {
  song_id: string;
  artifact_path?: string;
  source_path?: string;
  lyrics_source_file?: string;
  lyrics_source_export?: string;
  line_count?: number;
}

const API_BASE = import.meta.env.VITE_VIDEO_API_URL ?? "http://127.0.0.1:8765";

export const generateSceneImage = async (
  payload: GenerateSceneImagePayload
): Promise<GenerateSceneImageResult> => {
  const response = await fetch(`${API_BASE}/api/video/generate-scene-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      width: 1280,
      height: 720,
      provider: "fal",
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error(`Image generation failed with ${response.status}.`);
  }

  return response.json() as Promise<GenerateSceneImageResult>;
};

export const saveLyrics = async (
  payload: SaveLyricsPayload
): Promise<SaveLyricsResult> => {
  const response = await fetch(`${API_BASE}/api/video/save-lyrics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Saving lyrics failed with ${response.status}.`);
  }

  return response.json() as Promise<SaveLyricsResult>;
};
