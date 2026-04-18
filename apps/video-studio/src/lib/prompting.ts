import type { SceneSpec } from "./types";

export const expandScenePrompt = (scene: SceneSpec): string =>
  [
    scene.prompt,
    "editorial music-video still",
    "layer-separated composition for parallax animation",
    "precise negative space",
    "cinematic lighting",
    "high-detail atmospheric depth"
  ].join(", ");
