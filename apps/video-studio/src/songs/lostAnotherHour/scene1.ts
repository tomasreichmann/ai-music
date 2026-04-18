import { getBoxOrigin } from "../../lib/scene-geometry";
import type { SceneSpec } from "../../lib/types";
import { LayeredScene1 } from "./LayeredScene1";

const IMAGE_WIDTH = 1536;
const IMAGE_HEIGHT = 1024;
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const IMAGE_ROOT = "/projects/lost-another-hour-to-the-bass/images";

type BoundaryLabel = "baggie" | "doorway" | "guy" | "sink";

interface DetectionBoundary {
  label: BoundaryLabel;
  top: number;
  left: number;
  width: number;
  height: number;
}

const detectionBoundaries: Record<BoundaryLabel, DetectionBoundary> = {
  guy: {
    label: "guy",
    top: 284,
    left: 910,
    width: 624,
    height: 703
  },
  sink: {
    label: "sink",
    top: 342,
    left: 1,
    width: 442,
    height: 369
  },
  doorway: {
    label: "doorway",
    top: 24,
    left: 640,
    width: 404,
    height: 679
  },
  baggie: {
    label: "baggie",
    top: 818,
    left: 574,
    width: 183,
    height: 124
  }
};

const imagePath = (name: string): string => `${IMAGE_ROOT}/${name}`;

const sourceSize = { width: IMAGE_WIDTH, height: IMAGE_HEIGHT };
const stageSize = { width: STAGE_WIDTH, height: STAGE_HEIGHT };

const baggieOrigin = getBoxOrigin({
  box: detectionBoundaries.baggie,
  sourceSize,
  targetSize: stageSize,
  vertical: "center",
  fit: "cover"
});
const sinkOrigin = getBoxOrigin({
  box: detectionBoundaries.sink,
  sourceSize,
  targetSize: stageSize,
  vertical: "center",
  fit: "cover"
});
const guyBottomOrigin = getBoxOrigin({
  box: detectionBoundaries.guy,
  sourceSize,
  vertical: "bottom"
});

export const lostAnotherHourScene1: SceneSpec = {
  id: "intro-body",
  title: "Suspicious Find",
  startBeat: 1,
  endBeat: 44,
  component: LayeredScene1,
  prompt: "toilet-floor baggie, deadpan grin, mischief before consequences in a warped club corridor",
  notes: "Layered still stack driven by the scene 1 masks and detection boundaries.",
  lyricsOverlay: {
    className: "lyric-caption lyric-caption--scene-1",
    backdropClassName: "lyric-caption__backdrop lyric-caption__backdrop--scene-1"
  },
  transformOrigin: baggieOrigin,
  layers: [
    {
      id: "scene-1-background",
      label: "Scene 1 Background",
      src: imagePath("scene-1-background.png"),
      depth: 0.08,
      opacity: 1
    },
    {
      id: "scene-1-doorway",
      label: "Scene 1 Doorway",
      src: imagePath("scene-1-background.png"),
      maskSrc: imagePath("scene-1-doorway-mask.png"),
      maskMode: "luminance",
      depth: 0.16,
      opacity: 1
    },
    {
      id: "scene-1-mirror",
      label: "Scene 1 Mirror",
      src: imagePath("scene-1-background.png"),
      maskSrc: imagePath("scene-1-mirror-mask.png"),
      maskMode: "luminance",
      depth: 0.2,
      opacity: 1
    },
    {
      id: "scene-1-baggie",
      label: "Scene 1 Baggie",
      src: imagePath("scene-1-composite.png"),
      maskSrc: imagePath("scene-1-baggie-mask.png"),
      maskMode: "luminance",
      depth: 0.36,
      opacity: 1,
      transformOrigin: baggieOrigin,
      motion: {
        rotate: { source: "bass", outputRange: [-15, 15] },
        hueRotate: { source: "high", outputRange: [0, 42] }
      }
    },
    {
      id: "scene-1-sink",
      label: "Scene 1 Sink",
      src: imagePath("scene-1-composite.png"),
      maskSrc: imagePath("scene-1-sink-mask.webp"),
      maskMode: "luminance",
      depth: 0.32,
      opacity: 1,
      transformOrigin: sinkOrigin,
      motion: {
        translateY: { source: "bass", outputRange: [10, -10] }
      }
    },
    {
      id: "scene-1-guy",
      label: "Scene 1 Guy",
      src: imagePath("scene-1-composite.png"),
      maskSrc: imagePath("scene-1-guy-mask.png"),
      maskMode: "luminance",
      depth: 0.42,
      opacity: 1,
      transformOrigin: guyBottomOrigin,
      motion: {
        rotate: { source: "sceneProgress", outputRange: [0, -15] }
      }
    }
  ],
  effects: [
    {
      kind: "zoomPan",
      params: { scale: 1, offsetY: 0 },
      bindings: {
        scale: { source: "sceneProgress", outputRange: [1, 1.14] }
      }
    },
    {
      kind: "glowBloom",
      params: { brightness: 1 },
      bindings: {
        brightness: { source: "bass", outputRange: [0.8, 1.6] }
      }
    }
  ]
};
