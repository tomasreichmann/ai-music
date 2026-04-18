import { resolveMediaUrl } from "../../lib/bridge";
import type { SongComposition } from "../../lib/types";
import { IntroScene0 } from "./IntroScene0";
import { lostAnotherHourLyrics } from "./lyrics";
import { lostAnotherHourScene1 } from "./scene1";
import { lostAnotherHourScene2 } from "./scene2";

const cover = resolveMediaUrl("outputs/media/Lost Another Hour to the Bass.jpeg");
const track = resolveMediaUrl("outputs/tracks/Lost Another Hour to the Bass.wav");

export const lostAnotherHourSong: SongComposition = {
  songId: "lost-another-hour-to-the-bass",
  title: "Lost Another Hour to the Bass",
  audioFile: track,
  analysisFile: "outputs/video/lost-another-hour-to-the-bass/lost-another-hour-to-the-bass.analysis.json",
  lyricsSourceFile: "apps/video-studio/src/songs/lostAnotherHour/lyrics.ts",
  lyricsSourceExport: "lostAnotherHourLyrics",
  lyrics: lostAnotherHourLyrics,
  fps: 30,
  width: 1920,
  height: 1080,
  bookends: {
    intro: {
      id: "cold-open",
      title: "Before The Drop",
      durationSec: 3,
      component: IntroScene0,
      prompt: "club-logo teaser over a spinning bathroom still before the first suspicious discovery lands",
      notes: "Spin the background slowly, pulse the logo once per second, then fade the whole intro down to black.",
      layers: [],
      effects: []
    },
    outro: {
      id: "comedown",
      title: "After The Joke",
      durationSec: 2,
      prompt: "cold night air and embarrassed aftermath under sodium lights",
      notes: "Let the image settle after the vocal warning lands.",
      layers: [
        { id: "cover", label: "Cover", src: cover, depth: 0.1, opacity: 0.94 },
        { id: "flare", label: "Flare", src: "/images/flare.svg", depth: 0.84, opacity: 0.4, blendMode: "screen" }
      ],
      effects: [
        {
          kind: "blurChromatic",
          params: { blur: 0.5, split: 0.1 },
          bindings: {
            blur: { source: "sceneProgress", outputRange: [0, 1.2] }
          }
        }
      ]
    }
  },
  scenes: [
    lostAnotherHourScene1,
    lostAnotherHourScene2,
    {
      id: "buildup-1",
      title: "Hallway Sways",
      startBeat: 97,
      endBeat: 129,
      prompt: "snare-roll tension, doorway wobbling, laser haze, grin slipping out of control",
      notes: "Let the image tighten and pulse before the first chorus lands.",
      layers: [
        { id: "cover", label: "Cover", src: cover, depth: 0.1, opacity: 0.9 },
        { id: "flare", label: "Flare", src: "/images/flare.svg", depth: 1.1, opacity: 0.66, blendMode: "screen" }
      ],
      effects: [
        { kind: "beatFlash", params: { opacity: 0.2 }, bindings: { opacity: { source: "beatPulse", outputRange: [0.08, 0.72] } } },
        { kind: "glowBloom", params: { brightness: 1.08 }, bindings: { brightness: { source: "loudness", outputRange: [1.04, 1.22] } } }
      ]
    },
    {
      id: "chorus-1",
      title: "Lost Another Hour",
      startBeat: 129,
      endBeat: 225,
      prompt: "full drop impact, crowd-surge lift, reese bass swallowing time and space",
      notes: "Turn the cover into a rave totem and let the EQ bars breathe.",
      layers: [
        { id: "cover", label: "Cover", src: cover, depth: 0.12, opacity: 0.96 },
        { id: "grid", label: "Grid", src: "/images/grid.svg", depth: 0.48, opacity: 0.44, blendMode: "screen" },
        { id: "flare", label: "Flare", src: "/images/flare.svg", depth: 0.9, opacity: 0.54, blendMode: "screen" }
      ],
      effects: [
        { kind: "visualEqBars", params: { opacity: 0.85 } },
        { kind: "parallax", params: { amount: 24 }, bindings: { amount: { source: "bass", outputRange: [16, 44] } } },
        { kind: "particlesOverlay", params: { opacity: 0.24 }, bindings: { opacity: { source: "highMid", outputRange: [0.16, 0.48] } } }
      ]
    },
    {
      id: "verse-2",
      title: "Room Ain't Straight",
      startBeat: 225,
      endBeat: 289,
      prompt: "surreal panic, clock dripping, falling through tiles while the kick keeps smiling",
      notes: "Ease back from the first drop, but keep the instability alive.",
      layers: [
        { id: "cover", label: "Cover", src: cover, depth: 0.14, opacity: 0.98 },
        { id: "city", label: "City", src: "/images/city.svg", depth: 0.64, opacity: 0.36, blendMode: "screen" }
      ],
      effects: [
        { kind: "colorGrade", params: { saturation: 1.02, hueShift: 0 }, bindings: { hueShift: { source: "mid", outputRange: [-8, 8] } } },
        { kind: "zoomPan", params: { scale: 1.01, offsetY: 0 }, bindings: { offsetY: { source: "sceneProgress", outputRange: [12, -10] } } }
      ]
    },
    {
      id: "buildup-2",
      title: "Shoelace Argument",
      startBeat: 289,
      endBeat: 321,
      prompt: "urgent chant, clock hands spinning, laser haze, the whole room laughing",
      notes: "Make this one thinner, brighter, and a little more unhinged.",
      layers: [
        { id: "cover", label: "Cover", src: cover, depth: 0.1, opacity: 0.92 },
        { id: "flare", label: "Flare", src: "/images/flare.svg", depth: 1.15, opacity: 0.72, blendMode: "screen" }
      ],
      effects: [
        { kind: "beatFlash", params: { opacity: 0.24 }, bindings: { opacity: { source: "beatPulse", outputRange: [0.12, 0.86] } } },
        { kind: "blurChromatic", params: { blur: 1, split: 0.5 }, bindings: { blur: { source: "loudness", outputRange: [0.2, 2] } } }
      ]
    },
    {
      id: "chorus-2",
      title: "Outer Space Venue",
      startBeat: 321,
      endBeat: 417,
      prompt: "second drop, harder fills, vanished mates, venue drifting into outer space",
      notes: "Use the same chorus DNA but push the glare and motion harder.",
      layers: [
        { id: "cover", label: "Cover", src: cover, depth: 0.12, opacity: 0.95 },
        { id: "grid", label: "Grid", src: "/images/grid.svg", depth: 0.44, opacity: 0.46, blendMode: "screen" },
        { id: "flare", label: "Flare", src: "/images/flare.svg", depth: 0.94, opacity: 0.64, blendMode: "screen" }
      ],
      effects: [
        { kind: "visualEqBars", params: { opacity: 0.9 } },
        { kind: "particlesOverlay", params: { opacity: 0.28 }, bindings: { opacity: { source: "high", outputRange: [0.18, 0.58] } } },
        { kind: "glowBloom", params: { brightness: 1.1 }, bindings: { brightness: { source: "loudness", outputRange: [1.04, 1.26] } } }
      ]
    },
    {
      id: "bridge",
      title: "Embarrassed Clarity",
      startBeat: 417,
      endBeat: 465,
      prompt: "back door dash, cold night breeze, one ugly lesson landing late",
      notes: "Let the comedy turn a little sober without losing the groove entirely.",
      layers: [
        { id: "cover", label: "Cover", src: cover, depth: 0.12, opacity: 0.96 },
        { id: "city", label: "City", src: "/images/city.svg", depth: 0.56, opacity: 0.28, blendMode: "screen" }
      ],
      effects: [
        { kind: "colorGrade", params: { saturation: 0.98 }, bindings: { saturation: { source: "sceneProgress", outputRange: [1.02, 0.84] } } }
      ]
    },
    {
      id: "outro-body",
      title: "Soft Caution",
      startBeat: 465,
      endBeat: 513,
      prompt: "sunlight on pavement, still out of place, caution after the come-down",
      notes: "Leave room for the final line and taper the movement down.",
      layers: [
        { id: "cover", label: "Cover", src: cover, depth: 0.12, opacity: 0.96 },
        { id: "flare", label: "Flare", src: "/images/flare.svg", depth: 0.8, opacity: 0.28, blendMode: "screen" }
      ],
      effects: [
        { kind: "zoomPan", params: { scale: 1.02 }, bindings: { scale: { source: "sceneProgress", outputRange: [1.02, 1.06] } } }
      ]
    }
  ]
};
