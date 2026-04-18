import { Composition } from "remotion";

import { demoDurationInFrames, demoSong } from "../songs/demoSong";
import { MusicVideoComposition } from "./MusicVideoComposition";

export const RemotionRoot = () => (
  <Composition
    id={demoSong.songId}
    component={MusicVideoComposition}
    durationInFrames={demoDurationInFrames}
    fps={demoSong.fps}
    width={demoSong.width}
    height={demoSong.height}
    defaultProps={{
      song: demoSong,
      showSceneDebug: false
    }}
  />
);
