import analysis from "../../data/demo-analysis.json";
import { bars } from "../../lib/timing";
import type { SongComposition } from "../../lib/types";

const opening = bars(1, 3);
const lift = bars(3, 5);

export const demoSong: SongComposition = {
  songId: "pulse-demo",
  title: "Pulse Demo",
  audioFile: "/audio/demo-song.wav",
  analysisFile: "/analysis/pulse-demo.analysis.json",
  fps: 30,
  width: 1280,
  height: 720,
  scenes: [
    {
      id: "intro",
      title: "Intro Drift",
      startBeat: opening.startBeat,
      endBeat: opening.endBeat,
      prompt: "dawn traffic reflected in wet concrete under a copper sky",
      notes: "Let the bass push the skyline forward while the mids bloom in the haze.",
      layers: [
        { id: "sky", label: "Sky", src: "/images/sky.svg", depth: 0.12, opacity: 1 },
        { id: "grid", label: "Grid", src: "/images/grid.svg", depth: 0.4, opacity: 0.8, blendMode: "multiply" },
        { id: "city", label: "City", src: "/images/city.svg", depth: 0.9, opacity: 0.92 }
      ],
      effects: [
        {
          kind: "parallax",
          params: { amount: 24 },
          bindings: {
            amount: { source: "bass", outputRange: [12, 38] }
          }
        },
        {
          kind: "colorGrade",
          params: { saturation: 1, hueShift: 0 },
          bindings: {
            saturation: { source: "mid", outputRange: [0.95, 1.3] }
          }
        },
        {
          kind: "beatFlash",
          params: { opacity: 0.12 },
          bindings: {
            opacity: { source: "beatPulse", outputRange: [0.08, 0.42] }
          }
        },
        {
          kind: "visualEqBars",
          params: { opacity: 0.75 }
        }
      ]
    },
    {
      id: "lift",
      title: "Lift",
      startBeat: lift.startBeat,
      endBeat: lift.endBeat,
      prompt: "the city core opens into altitude and vapor trails with deliberate light leaks",
      notes: "Increase motion and soften the blur as the highs arrive.",
      layers: [
        { id: "sky", label: "Sky", src: "/images/sky.svg", depth: 0.08, opacity: 1 },
        { id: "city", label: "City", src: "/images/city.svg", depth: 0.62, opacity: 0.88 },
        { id: "flare", label: "Flare", src: "/images/flare.svg", depth: 1.1, opacity: 0.9, blendMode: "screen" }
      ],
      effects: [
        {
          kind: "zoomPan",
          params: { scale: 1.02, offsetY: 0 },
          bindings: {
            scale: { source: "sceneProgress", outputRange: [1.02, 1.14] },
            offsetY: { source: "highMid", outputRange: [10, -16] }
          }
        },
        {
          kind: "blurChromatic",
          params: { blur: 2, split: 0.5 },
          bindings: {
            blur: { source: "songProgress", outputRange: [3, 0.5] },
            split: { source: "high", outputRange: [0.2, 1] }
          }
        },
        {
          kind: "particlesOverlay",
          params: { density: 14, opacity: 0.3 },
          bindings: {
            opacity: { source: "high", outputRange: [0.18, 0.5] }
          }
        }
      ]
    }
  ]
};

export const demoAnalysisMeta = analysis;
export const demoDurationInFrames = Math.ceil(analysis.durationSec * demoSong.fps);
