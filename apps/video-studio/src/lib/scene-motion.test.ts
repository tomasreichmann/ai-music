import { deterministicJitter, loopPulse, ramp } from "./scene-motion";

describe("scene motion", () => {
  it("stays deterministic for the same frame and seed", () => {
    expect(deterministicJitter(12, 11)).toBeCloseTo(deterministicJitter(12, 11), 8);
  });

  it("changes over time while remaining bounded", () => {
    const current = deterministicJitter(12, 11);
    const next = deterministicJitter(13, 11);

    expect(current).not.toBeCloseTo(next, 8);
    expect(Math.abs(current)).toBeLessThanOrEqual(1);
    expect(Math.abs(next)).toBeLessThanOrEqual(1);
  });

  it("loops a smooth pulse over a fixed interval", () => {
    expect(loopPulse(0, 1)).toBeCloseTo(0, 8);
    expect(loopPulse(0.5, 1)).toBeCloseTo(1, 8);
    expect(loopPulse(1, 1)).toBeCloseTo(0, 8);
    expect(loopPulse(1.5, 1)).toBeCloseTo(1, 8);
  });

  it("ramps a value between two bounds and clamps outside them", () => {
    expect(ramp(0.1, 0.2, 0.4)).toBe(0);
    expect(ramp(0.3, 0.2, 0.4)).toBeCloseTo(0.5, 8);
    expect(ramp(0.5, 0.2, 0.4)).toBe(1);
  });
});
