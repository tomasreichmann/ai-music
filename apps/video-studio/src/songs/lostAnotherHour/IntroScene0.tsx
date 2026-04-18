import { Img } from "remotion";

import { loopPulse, ramp } from "../../lib/scene-motion";
import type { BookendRendererProps } from "../../lib/types";
import { assetPath } from "../../remotion/scenes/shared";

const IMAGE_ROOT = "/projects/lost-another-hour-to-the-bass/images";

const imagePath = (name: string): string => `${IMAGE_ROOT}/${name}`;

export const IntroScene0 = ({ bookend, runtime }: BookendRendererProps) => {
  const localTimeSec = runtime.sceneProgress * bookend.durationSec;
  const backgroundScale = 1 + runtime.sceneProgress * 0.2;
  const backgroundRotate = runtime.sceneProgress * 10;
  const logoOpacity = ramp(runtime.sceneProgress, 0.06, 0.22) * (1 - ramp(runtime.sceneProgress, 0.72, 0.9));
  const logoBrightness = 1 + loopPulse(localTimeSec, 1) * 0.5;
  const blackoutOpacity = ramp(runtime.sceneProgress, 0.8, 1);

  return (
    <>
      <Img
        src={assetPath(imagePath("scene-0-background.png"))}
        className="scene-layer"
        style={{
          transform: `rotate(${backgroundRotate.toFixed(2)}deg) scale(${backgroundScale.toFixed(4)})`,
          transformOrigin: "50% 50%"
        }}
      />
      <Img
        src={assetPath(imagePath("scene-0-logo.png"))}
        className="scene-0-logo"
        style={{
          opacity: logoOpacity,
          filter: `brightness(${logoBrightness.toFixed(3)}) drop-shadow(0 20px 50px rgba(0, 0, 0, 0.45))`
        }}
      />
      <div className="composition-blackout" style={{ opacity: blackoutOpacity }} />
    </>
  );
};
