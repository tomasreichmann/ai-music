import { mapBinding, resolveEffectBindings } from "./effects";
import type { EffectPresetSpec } from "./types";

describe("effect bindings", () => {
  it("maps runtime sources into effect parameters", () => {
    expect(
      mapBinding(
        {
          source: "sceneProgress",
          outputRange: [0.9, 1.15]
        },
        {
          sceneProgress: 0.5,
          songProgress: 0.2,
          beatPulse: 0,
          loudness: 0,
          bands: { sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 }
        }
      )
    ).toBeCloseTo(1.025, 4);
  });

  it("resolves grouped effect params against runtime state", () => {
    const effect: EffectPresetSpec = {
      kind: "beatFlash",
      params: {
        opacity: 0.15
      },
      bindings: {
        opacity: {
          source: "beatPulse",
          outputRange: [0.15, 0.9]
        }
      }
    };

    expect(
      resolveEffectBindings(effect, {
        sceneProgress: 0.25,
        songProgress: 0.25,
        beatPulse: 0.5,
        loudness: 0.4,
        bands: { sub: 0.2, bass: 0.8, lowMid: 0.3, mid: 0.4, highMid: 0.2, high: 0.1 }
      }).opacity
    ).toBeCloseTo(0.525, 4);
  });

  it("supports loudness as a binding source", () => {
    expect(
      mapBinding(
        {
          source: "loudness",
          outputRange: [0.2, 1]
        },
        {
          sceneProgress: 0,
          songProgress: 0,
          beatPulse: 0,
          loudness: 0.5,
          bands: { sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 }
        }
      )
    ).toBeCloseTo(0.6, 4);
  });
});
