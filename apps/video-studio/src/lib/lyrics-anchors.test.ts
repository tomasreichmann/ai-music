import { anchorSection, buildWordCues, line } from "./lyrics-anchors";

describe("lyrics anchors", () => {
  it("spreads words across a requested beat window", () => {
    const words = buildWordCues("Found a white baggie...", 13, 16);

    expect(words[0]).toMatchObject({ text: "Found", startBeat: 13 });
    expect(words.at(-1)).toMatchObject({ text: "baggie...", endBeat: 16 });
    expect(words.every((word, index) => index === 0 || word.startBeat >= (words[index - 1]?.endBeat ?? 0))).toBe(true);
  });

  it("keeps explicit line windows and gaps aligned", () => {
    const lines = anchorSection("intro", 13, [
      { text: "Found a white baggie...", beats: 3, startBeat: 13, endBeat: 16, gapAfter: 5 },
      line("He he", 2),
      { text: "Uuuuu!", beats: 2, startBeat: 25, endBeat: 27 },
      { text: "Found a white baggie lying on a toilet floor...", beats: 8, startBeat: 27, endBeat: 35 }
    ]);

    expect(lines.map((entry) => [entry.startBeat, entry.endBeat])).toEqual([
      [13, 16],
      [21, 23],
      [25, 27],
      [27, 35]
    ]);
  });
});
