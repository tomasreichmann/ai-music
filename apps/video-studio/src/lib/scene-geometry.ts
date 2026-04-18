export interface RectBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size2d {
  width: number;
  height: number;
}

const toPercent = (value: number, total: number): string => `${((value / total) * 100).toFixed(2)}%`;

const projectCoverPoint = ({
  x,
  y,
  sourceSize,
  targetSize
}: {
  x: number;
  y: number;
  sourceSize: Size2d;
  targetSize: Size2d;
}): string => {
  const scale = Math.max(targetSize.width / sourceSize.width, targetSize.height / sourceSize.height);
  const offsetX = (targetSize.width - sourceSize.width * scale) / 2;
  const offsetY = (targetSize.height - sourceSize.height * scale) / 2;

  return `${toPercent(x * scale + offsetX, targetSize.width)} ${toPercent(y * scale + offsetY, targetSize.height)}`;
};

export const getBoxOrigin = ({
  box,
  sourceSize,
  vertical,
  fit = "raw",
  targetSize
}: {
  box: RectBounds;
  sourceSize: Size2d;
  vertical: "center" | "bottom";
  fit?: "raw" | "cover";
  targetSize?: Size2d;
}): string => {
  const x = box.left + box.width / 2;
  const y = vertical === "bottom" ? box.top + box.height : box.top + box.height / 2;

  if (fit === "cover" && targetSize) {
    return projectCoverPoint({ x, y, sourceSize, targetSize });
  }

  return `${toPercent(x, sourceSize.width)} ${toPercent(y, sourceSize.height)}`;
};
