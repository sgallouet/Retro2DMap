import {
  ALL_CARDINAL,
  EAST,
  NORTH,
  NORTH_EAST,
  NORTH_WEST,
  SOUTH,
  SOUTH_EAST,
  SOUTH_WEST,
  WEST,
} from "../domain/autotile";

export type RoadMaterial = "path" | "cobble";

export interface RoadClearRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GrassMaterialSource {
  readonly image: CanvasImageSource;
  readonly size: number;
}

const SEGMENT_COUNT = 6;
const SIDE_PROFILES: Readonly<Record<RoadMaterial, readonly number[]>> = {
  // Endpoints stay at one pixel so adjacent exposed cells meet at the same
  // owned corner without independently randomized gaps.
  path: [1, 2, 3, 2, 2, 1],
  cobble: [1, 1, 2, 2, 1, 1],
};

const sideRects = (
  material: RoadMaterial,
  width: number,
  height: number,
  side: "north" | "east" | "south" | "west",
): readonly RoadClearRect[] => {
  const profile = SIDE_PROFILES[material];
  const result: RoadClearRect[] = [];

  for (let index = 0; index < SEGMENT_COUNT; index += 1) {
    const start = Math.floor((index * (side === "north" || side === "south" ? width : height)) / SEGMENT_COUNT);
    const end = Math.floor(((index + 1) * (side === "north" || side === "south" ? width : height)) / SEGMENT_COUNT);
    const span = Math.max(1, end - start);
    const depth = profile[index] ?? 1;

    if (side === "north") result.push({ x: start, y: 0, width: span, height: depth });
    if (side === "south") result.push({ x: start, y: height - depth, width: span, height: depth });
    if (side === "west") result.push({ x: 0, y: start, width: depth, height: span });
    if (side === "east") result.push({ x: width - depth, y: start, width: depth, height: span });
  }

  return result;
};

const innerCornerRects = (
  width: number,
  height: number,
  innerCornerMask: number,
): readonly RoadClearRect[] => {
  const result: RoadClearRect[] = [];
  const depth = 3;

  // Three stepped pixels make the diagonal opening read as a rounded/eroded
  // corner while retaining both connected road arms.
  if ((innerCornerMask & NORTH_EAST) !== 0) {
    result.push(
      { x: width - 1, y: 0, width: 1, height: 1 },
      { x: width - 2, y: 1, width: 2, height: 1 },
      { x: width - depth, y: 2, width: depth, height: 1 },
    );
  }
  if ((innerCornerMask & SOUTH_EAST) !== 0) {
    result.push(
      { x: width - 1, y: height - 1, width: 1, height: 1 },
      { x: width - 2, y: height - 2, width: 2, height: 1 },
      { x: width - depth, y: height - 3, width: depth, height: 1 },
    );
  }
  if ((innerCornerMask & SOUTH_WEST) !== 0) {
    result.push(
      { x: 0, y: height - 1, width: 1, height: 1 },
      { x: 0, y: height - 2, width: 2, height: 1 },
      { x: 0, y: height - 3, width: depth, height: 1 },
    );
  }
  if ((innerCornerMask & NORTH_WEST) !== 0) {
    result.push(
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 0, y: 1, width: 2, height: 1 },
      { x: 0, y: 2, width: depth, height: 1 },
    );
  }

  return result;
};

const modulo = (value: number, divisor: number): number =>
  ((value % divisor) + divisor) % divisor;

const drawPeriodicRect = (
  ctx: CanvasRenderingContext2D,
  source: GrassMaterialSource,
  rect: RoadClearRect,
  worldPixelX: number,
  worldPixelY: number,
): void => {
  const size = source.size;
  let remainingHeight = rect.height;
  let destinationY = rect.y;
  let sourceY = modulo(worldPixelY + rect.y, size);

  while (remainingHeight > 0) {
    const sourceHeight = Math.min(remainingHeight, size - sourceY);
    let remainingWidth = rect.width;
    let destinationX = rect.x;
    let sourceX = modulo(worldPixelX + rect.x, size);

    while (remainingWidth > 0) {
      const sourceWidth = Math.min(remainingWidth, size - sourceX);
      ctx.drawImage(
        source.image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        destinationX,
        destinationY,
        sourceWidth,
        sourceHeight,
      );
      remainingWidth -= sourceWidth;
      destinationX += sourceWidth;
      sourceX = 0;
    }

    remainingHeight -= sourceHeight;
    destinationY += sourceHeight;
    sourceY = 0;
  }
};

const drawRoadEdgeAccents = (
  ctx: CanvasRenderingContext2D,
  material: RoadMaterial,
  width: number,
  height: number,
  cardinalMask: number,
): void => {
  const profile = SIDE_PROFILES[material];
  const openMask = ALL_CARDINAL ^ cardinalMask;
  const joint = material === "path" ? "rgba(116,87,38,.42)" : "rgba(70,72,71,.42)";
  const highlight = material === "path" ? "rgba(255,228,148,.34)" : "rgba(229,229,223,.34)";

  ctx.fillStyle = joint;
  for (let index = 0; index < SEGMENT_COUNT; index += 2) {
    const startX = Math.floor((index * width) / SEGMENT_COUNT);
    const endX = Math.floor(((index + 1) * width) / SEGMENT_COUNT);
    const startY = Math.floor((index * height) / SEGMENT_COUNT);
    const endY = Math.floor(((index + 1) * height) / SEGMENT_COUNT);
    const spanX = Math.max(1, endX - startX - 2);
    const spanY = Math.max(1, endY - startY - 2);
    const depth = profile[index] ?? 1;

    if ((openMask & NORTH) !== 0) ctx.fillRect(startX + 1, depth, spanX, 1);
    if ((openMask & SOUTH) !== 0) ctx.fillRect(startX + 1, height - depth - 1, spanX, 1);
    if ((openMask & WEST) !== 0) ctx.fillRect(depth, startY + 1, 1, spanY);
    if ((openMask & EAST) !== 0) ctx.fillRect(width - depth - 1, startY + 1, 1, spanY);
  }

  // A few upper-left facing pixels keep the contour material-specific without
  // becoming a continuous ruler line.
  ctx.fillStyle = highlight;
  if ((openMask & NORTH) !== 0) ctx.fillRect(5, profile[0] ?? 1, 4, 1);
  if ((openMask & WEST) !== 0) ctx.fillRect(profile[0] ?? 1, 5, 1, 4);
};

/**
 * Returns the small transparent contour owned by one exposed road tile.
 * Connected cardinal sides deliberately produce no clear rectangles, so a
 * road stays fully opaque across shared boundaries.
 */
export const roadContourPlan = (
  material: RoadMaterial,
  width: number,
  height: number,
  cardinalMask: number,
  innerCornerMask: number,
): readonly RoadClearRect[] => {
  const result: RoadClearRect[] = [];
  const openMask = ALL_CARDINAL ^ cardinalMask;

  if ((openMask & NORTH) !== 0) result.push(...sideRects(material, width, height, "north"));
  if ((openMask & EAST) !== 0) result.push(...sideRects(material, width, height, "east"));
  if ((openMask & SOUTH) !== 0) result.push(...sideRects(material, width, height, "south"));
  if ((openMask & WEST) !== 0) result.push(...sideRects(material, width, height, "west"));

  result.push(...innerCornerRects(width, height, innerCornerMask));
  return result;
};

/**
 * Applies the road contour after the authored center has been blitted. A
 * grass-owned contour is composed into the road tile; other exposed contour
 * pixels remain transparent so the existing empty-cell behavior is preserved.
 */
export const applyRoadContour = (
  ctx: CanvasRenderingContext2D,
  material: RoadMaterial,
  width: number,
  height: number,
  cardinalMask: number,
  innerCornerMask: number,
  grassNeighborMask = 0,
  grassMaterial?: GrassMaterialSource,
  worldPixelX = 0,
  worldPixelY = 0,
): void => {
  const openMask = ALL_CARDINAL ^ cardinalMask;
  const paint = (rects: readonly RoadClearRect[], grass: boolean): void => {
    rects.forEach((rect) => {
      if (grass && grassMaterial) {
        drawPeriodicRect(ctx, grassMaterial, rect, worldPixelX, worldPixelY);
      } else {
        ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      }
    });
  };

  if ((openMask & NORTH) !== 0) {
    paint(sideRects(material, width, height, "north"), (grassNeighborMask & NORTH) !== 0);
  }
  if ((openMask & EAST) !== 0) {
    paint(sideRects(material, width, height, "east"), (grassNeighborMask & EAST) !== 0);
  }
  if ((openMask & SOUTH) !== 0) {
    paint(sideRects(material, width, height, "south"), (grassNeighborMask & SOUTH) !== 0);
  }
  if ((openMask & WEST) !== 0) {
    paint(sideRects(material, width, height, "west"), (grassNeighborMask & WEST) !== 0);
  }

  if ((innerCornerMask & NORTH_EAST) !== 0) {
    paint(innerCornerRects(width, height, NORTH_EAST), (grassNeighborMask & NORTH_EAST) !== 0);
  }
  if ((innerCornerMask & SOUTH_EAST) !== 0) {
    paint(innerCornerRects(width, height, SOUTH_EAST), (grassNeighborMask & SOUTH_EAST) !== 0);
  }
  if ((innerCornerMask & SOUTH_WEST) !== 0) {
    paint(innerCornerRects(width, height, SOUTH_WEST), (grassNeighborMask & SOUTH_WEST) !== 0);
  }
  if ((innerCornerMask & NORTH_WEST) !== 0) {
    paint(innerCornerRects(width, height, NORTH_WEST), (grassNeighborMask & NORTH_WEST) !== 0);
  }
  drawRoadEdgeAccents(ctx, material, width, height, cardinalMask);
};
