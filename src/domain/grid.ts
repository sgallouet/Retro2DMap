import type { GridCoord } from "./map";

/**
 * Deterministic integer Bresenham rasterization.
 * Shared by editor gestures, procedural generators and future AI commands.
 */
export function rasterizeGridLine(start: GridCoord, end: GridCoord): GridCoord[] {
  const points: GridCoord[] = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const sx = start.x < end.x ? 1 : -1;
  const dy = -Math.abs(end.y - start.y);
  const sy = start.y < end.y ? 1 : -1;
  let error = dx + dy;

  while (true) {
    points.push({ x, y });
    if (x === end.x && y === end.y) break;

    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
  }

  return points;
}

export function rasterizePolyline(points: readonly GridCoord[]): GridCoord[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0]! }];

  const result: GridCoord[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (!start || !end) continue;

    const segment = rasterizeGridLine(start, end);
    if (result.length > 0) segment.shift();
    result.push(...segment);
  }

  return result;
}
