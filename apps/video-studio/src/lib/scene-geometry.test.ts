import { getBoxOrigin } from "./scene-geometry";

describe("scene geometry", () => {
  it("resolves raw image-space transform origins for box anchors", () => {
    expect(
      getBoxOrigin({
        box: { left: 20, top: 10, width: 40, height: 20 },
        sourceSize: { width: 100, height: 50 },
        vertical: "center"
      })
    ).toBe("40.00% 40.00%");

    expect(
      getBoxOrigin({
        box: { left: 20, top: 10, width: 40, height: 20 },
        sourceSize: { width: 100, height: 50 },
        vertical: "bottom"
      })
    ).toBe("40.00% 60.00%");
  });

  it("projects box anchors through object-fit cover into stage space", () => {
    expect(
      getBoxOrigin({
        box: { left: 25, top: 10, width: 20, height: 20 },
        sourceSize: { width: 100, height: 50 },
        targetSize: { width: 100, height: 100 },
        vertical: "center",
        fit: "cover"
      })
    ).toBe("20.00% 40.00%");
  });
});
