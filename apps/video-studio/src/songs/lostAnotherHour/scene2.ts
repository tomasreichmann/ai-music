import type { SceneSpec } from "../../lib/types";
import { LayeredScene2 } from "./LayeredScene2";

const IMAGE_ROOT = "/projects/lost-another-hour-to-the-bass/images";

const imagePath = (name: string): string => `${IMAGE_ROOT}/${name}`;

export const lostAnotherHourScene2: SceneSpec = {
  id: "scene-2",
  title: "Powder Line Drift",
  startBeat: 44,
  endBeat: 97,
  component: LayeredScene2,
  prompt:
    "A club-bathroom seam scene with a powder line across the middle, layered top and bottom panoramas, and a striped straw rising into frame on a slow parallax drift.",
  notes:
    "Start the back background scrolling 1s into the scene, then ease it only as far as the 3072x512 art needs to go to keep the viewport covered with no black gutter. Move the top background by 80% of that same overflow distance on the same eased timeline. Keep the line locked to the bottom background's horizontal motion. Bring the straw up from bottom 100% to 50% over the first 600ms, then let it shake lightly for the rest of the scene.",
  layers: [
    {
      id: "scene-2-background-bottom",
      label: "Scene 2 Background Bottom",
      src: imagePath("scene-2-background-bottom.jpg"),
      depth: 0.08,
      opacity: 1
    },
    {
      id: "scene-2-background-top",
      label: "Scene 2 Background Top",
      src: imagePath("scene-2-background-top.jpg"),
      depth: 0.16,
      opacity: 1
    },
    {
      id: "scene-2-line",
      label: "Scene 2 Line",
      src: imagePath("scene-2-line.png"),
      depth: 0.28,
      opacity: 1
    },
    {
      id: "scene-2-straw",
      label: "Scene 2 Straw",
      src: imagePath("scene-2-straw.png"),
      depth: 0.42,
      opacity: 1
    }
  ],
  effects: []
};
