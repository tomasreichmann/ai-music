import { Img } from "remotion";

import { deterministicJitter, ramp } from "../../lib/scene-motion";
import { getBeatTime } from "../../lib/timing";
import type { SceneRendererProps } from "../../lib/types";
import { assetPath } from "../../remotion/scenes/shared";

const IMAGE_ROOT = "/projects/lost-another-hour-to-the-bass/images";
const BACKGROUND_IMAGE_WIDTH = 3072;
const BACKGROUND_IMAGE_HEIGHT = 512;
const BACKGROUND_IMAGE_ASPECT_RATIO = BACKGROUND_IMAGE_WIDTH / BACKGROUND_IMAGE_HEIGHT;

const imagePath = (name: string): string => `${IMAGE_ROOT}/${name}`;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const easeOutQuint = (value: number): number => {
  const clamped = clamp01(value);
  return 1 - (1 - clamped) ** 5;
};

const prefersReducedMotion = (): boolean =>
  typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
    : typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

export const LayeredScene2 = ({ scene, song, analysis, runtime }: SceneRendererProps) => {
  const sceneStartSec = getBeatTime(analysis, scene.startBeat);
  const sceneEndSec = getBeatTime(analysis, scene.endBeat);
  const sceneDurationSec = Math.max(sceneEndSec - sceneStartSec, 0.001);
  const localTimeSec =
    runtime.songTimeSec != null ? Math.max(0, runtime.songTimeSec - sceneStartSec) : runtime.sceneProgress * sceneDurationSec;
  const reduceMotion = prefersReducedMotion();
  const backgroundHeight = song.height / 2;
  const backgroundWidth = backgroundHeight * BACKGROUND_IMAGE_ASPECT_RATIO;
  const backgroundOverflowX = Math.max(backgroundWidth - song.width, 0);

  const scrollProgress = reduceMotion ? 1 : easeOutQuint(ramp(localTimeSec, 1, sceneDurationSec));
  const bottomShiftX = backgroundOverflowX * scrollProgress;
  const topShiftX = backgroundOverflowX * 0.8 * scrollProgress;
  const lineShiftX = bottomShiftX;

  const strawEntryProgress = reduceMotion ? 1 : easeOutQuint(ramp(localTimeSec, 0, 0.6));
  const strawEntryY = -song.height * 0.5 * (1 - strawEntryProgress);
  const strawShakeProgress = reduceMotion ? 0 : ramp(localTimeSec, 0.6, sceneDurationSec);
  const strawShakeStrength = (0.35 + runtime.bands.bass * 0.65) * strawShakeProgress;
  const strawJitterX = deterministicJitter(runtime.frame, 17) * 4.5 * strawShakeStrength;
  const strawJitterY = deterministicJitter(runtime.frame, 29) * 2.5 * strawShakeStrength;
  const strawRotate = deterministicJitter(runtime.frame, 41) * 1.15 * strawShakeStrength;

  return (
    <div className="scene-2-stage" aria-label={scene.title}>
      <Img
        src={assetPath(imagePath("scene-2-background-bottom.jpg"))}
        className="scene-2-layer scene-2-background scene-2-background--bottom"
        style={{
          width: backgroundWidth + "px",
          height: backgroundHeight + "px",
          position: "absolute",
          objectFit: "cover",
          right: 0,
          bottom: 0,
          transform: `translate3d(${bottomShiftX.toFixed(2)}px, 0px, 0px)`
        }}
        />
      <Img
        src={assetPath(imagePath("scene-2-background-top.jpg"))}
        className="scene-2-layer scene-2-background scene-2-background--top"
        style={{
          width: backgroundWidth + "px",
          height: backgroundHeight + "px",
          position: "absolute",
          objectFit: "cover",
          right: 0,
          top: 0,
          transform: `translate3d(${topShiftX.toFixed(2)}px, 0px, 0px)`
        }}
      />
      <Img
        src={assetPath(imagePath("scene-2-line.png"))}
        className="scene-2-layer scene-2-line"
        style={{
          width: backgroundWidth + "px",
          transform: `translate3d(${lineShiftX.toFixed(2)}px, -50%, 0px)`
        }}
      />
      <Img
        src={assetPath(imagePath("scene-2-straw.png"))}
        className="scene-2-layer scene-2-straw"
        style={{
          width: song.height / 2 + "px",
          height: song.height / 2 + "px",
          position: "absolute",
          right: -song.height  / 8 + "px",
          bottom: "50%",
          transform: `translate3d(${strawJitterX.toFixed(2)}px, ${(strawEntryY + strawJitterY).toFixed(2)}px, 0px) rotate(${strawRotate.toFixed(2)}deg)`
        }}
      />
    </div>
  );
};
