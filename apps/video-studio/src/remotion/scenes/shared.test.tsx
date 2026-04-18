import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SceneLyrics } from "./shared";

vi.mock("remotion", () => ({
  Img: () => null,
  interpolate: (value: number, inputRange: [number, number], outputRange: [number, number]) => {
    const [inputStart, inputEnd] = inputRange;
    const [outputStart, outputEnd] = outputRange;
    const progress = (value - inputStart) / Math.max(inputEnd - inputStart, 0.0001);
    return outputStart + (outputEnd - outputStart) * progress;
  },
  staticFile: (value: string) => `/static/${value}`
}));

describe("SceneLyrics", () => {
  it("renders an optional backdrop and keeps the active word marked", () => {
    const { container } = render(
      <SceneLyrics
        line={{
          id: "line-1",
          text: "Lost another hour",
          startBeat: 1,
          endBeat: 4
        }}
        nextLine={{
          id: "line-2",
          text: "to the bass",
          startBeat: 4,
          endBeat: 6
        }}
        activeWordText="another"
        className="lyric-caption lyric-caption--scene-1"
        backdropClassName="lyric-caption__backdrop lyric-caption__backdrop--scene-1"
      />
    );

    expect(container.querySelector(".lyric-caption__backdrop--scene-1")).not.toBeNull();
    expect(screen.getByText("another")).toHaveClass("is-active");
    expect(screen.getByText("to the bass")).toBeInTheDocument();
  });
});
