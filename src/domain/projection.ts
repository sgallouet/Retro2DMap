import { TILE_SIZE, type GridCoord, type MapDocument } from "./map";

export type ProjectionMode = "top-down" | "isometric";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface ProjectionBounds {
  width: number;
  height: number;
}

export const ISO_TILE_WIDTH = TILE_SIZE * Math.SQRT2;
export const ISO_TILE_HEIGHT = TILE_SIZE / Math.SQRT2;
export const ISO_PADDING = TILE_SIZE * 2;

export const projectionLabel = (mode: ProjectionMode): string =>
  mode === "isometric" ? "Isometric" : "Top-down";

export const projectedBounds = (
  document: Pick<MapDocument, "width" | "height">,
  mode: ProjectionMode,
): ProjectionBounds => {
  if (mode === "top-down") {
    return {
      width: document.width * TILE_SIZE,
      height: document.height * TILE_SIZE,
    };
  }

  return {
    width: (document.width + document.height) * (ISO_TILE_WIDTH / 2) + ISO_PADDING * 2,
    height:
      (document.width + document.height) * (ISO_TILE_HEIGHT / 2) +
      ISO_PADDING * 2,
  };
};

/**
 * Projects a grid corner, not a cell center. In isometric mode (x, y) maps to
 * the north vertex of cell (x, y); this keeps the inverse transform exact for
 * pointer picking and lets arbitrary rectangular footprints become diamonds.
 */
export const projectGridCorner = (
  document: Pick<MapDocument, "width" | "height">,
  coord: WorldPoint,
  mode: ProjectionMode,
): WorldPoint => {
  if (mode === "top-down") {
    return {
      x: coord.x * TILE_SIZE,
      y: coord.y * TILE_SIZE,
    };
  }

  const halfWidth = ISO_TILE_WIDTH / 2;
  const halfHeight = ISO_TILE_HEIGHT / 2;
  const originX = ISO_PADDING + document.height * halfWidth;
  const originY = ISO_PADDING;

  return {
    x: originX + (coord.x - coord.y) * halfWidth,
    y: originY + (coord.x + coord.y) * halfHeight,
  };
};

export const projectCellCenter = (
  document: Pick<MapDocument, "width" | "height">,
  coord: GridCoord,
  mode: ProjectionMode,
): WorldPoint => {
  if (mode === "top-down") {
    return {
      x: coord.x * TILE_SIZE + TILE_SIZE / 2,
      y: coord.y * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  const north = projectGridCorner(document, coord, mode);
  return {
    x: north.x,
    y: north.y + ISO_TILE_HEIGHT / 2,
  };
};

export const projectFootprintCenter = (
  document: Pick<MapDocument, "width" | "height">,
  x: number,
  y: number,
  width: number,
  height: number,
  mode: ProjectionMode,
): WorldPoint => {
  if (mode === "top-down") {
    return {
      x: (x + width / 2) * TILE_SIZE,
      y: (y + height / 2) * TILE_SIZE,
    };
  }

  return projectGridCorner(
    document,
    { x: x + width / 2, y: y + height / 2 },
    mode,
  );
};

export const projectFootprintSouth = (
  document: Pick<MapDocument, "width" | "height">,
  x: number,
  y: number,
  width: number,
  height: number,
  mode: ProjectionMode,
): WorldPoint => {
  if (mode === "top-down") {
    return {
      x: (x + width / 2) * TILE_SIZE,
      y: (y + height) * TILE_SIZE,
    };
  }

  return projectGridCorner(document, { x: x + width, y: y + height }, mode);
};

export const projectedFootprintPolygon = (
  document: Pick<MapDocument, "width" | "height">,
  x: number,
  y: number,
  width: number,
  height: number,
  mode: ProjectionMode,
): readonly WorldPoint[] => {
  if (mode === "top-down") {
    const topLeft = projectGridCorner(document, { x, y }, mode);
    return [
      topLeft,
      { x: topLeft.x + width * TILE_SIZE, y: topLeft.y },
      {
        x: topLeft.x + width * TILE_SIZE,
        y: topLeft.y + height * TILE_SIZE,
      },
      { x: topLeft.x, y: topLeft.y + height * TILE_SIZE },
    ];
  }

  return [
    projectGridCorner(document, { x, y }, mode),
    projectGridCorner(document, { x: x + width, y }, mode),
    projectGridCorner(document, { x: x + width, y: y + height }, mode),
    projectGridCorner(document, { x, y: y + height }, mode),
  ];
};

export const worldToGrid = (
  document: Pick<MapDocument, "width" | "height">,
  point: WorldPoint,
  mode: ProjectionMode,
): GridCoord | null => {
  let x: number;
  let y: number;

  if (mode === "top-down") {
    x = Math.floor(point.x / TILE_SIZE);
    y = Math.floor(point.y / TILE_SIZE);
  } else {
    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;
    const originX = ISO_PADDING + document.height * halfWidth;
    const originY = ISO_PADDING;
    const u = (point.x - originX) / halfWidth;
    const v = (point.y - originY) / halfHeight;

    x = Math.floor((u + v) / 2);
    y = Math.floor((v - u) / 2);
  }

  if (x < 0 || y < 0 || x >= document.width || y >= document.height) return null;
  return { x, y };
};
