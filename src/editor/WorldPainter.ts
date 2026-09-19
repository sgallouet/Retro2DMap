import { tileAt, type BrushSize, type GridCoord, type MapDocument } from "../domain/map";

export interface TerrainBrushRequest {
  center: GridCoord;
  terrainId: string;
  size: BrushSize;
}

export interface TerrainRectRequest {
  from: GridCoord;
  to: GridCoord;
  terrainId: string;
}

export interface TerrainPathRequest {
  points: readonly GridCoord[];
  terrainId: string;
  width: BrushSize;
}

export interface IWorldPainter {
  paintTerrainBrush(document: MapDocument, request: TerrainBrushRequest): boolean;
  paintTerrainRect(document: MapDocument, request: TerrainRectRequest): boolean;
  paintTerrainPath(document: MapDocument, request: TerrainPathRequest): boolean;
}

/**
 * Pure semantic world painter.
 *
 * It never chooses sprites, border frames or corner graphics. It paints the
 * logical region only. The topology resolver derives border/interior roles
 * afterward, so manual editing, generators and future AI tools all produce
 * identical visual decisions from the same map data.
 */
export class LogicalWorldPainter implements IWorldPainter {
  paintTerrainBrush(document: MapDocument, request: TerrainBrushRequest): boolean {
    const radius = Math.floor(request.size / 2);
    let changed = false;

    for (let y = request.center.y - radius; y <= request.center.y + radius; y += 1) {
      for (let x = request.center.x - radius; x <= request.center.x + radius; x += 1) {
        changed = this.paintCell(document, { x, y }, request.terrainId) || changed;
      }
    }

    return changed;
  }

  paintTerrainRect(document: MapDocument, request: TerrainRectRequest): boolean {
    const minX = Math.min(request.from.x, request.to.x);
    const maxX = Math.max(request.from.x, request.to.x);
    const minY = Math.min(request.from.y, request.to.y);
    const maxY = Math.max(request.from.y, request.to.y);
    let changed = false;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        changed = this.paintCell(document, { x, y }, request.terrainId) || changed;
      }
    }

    return changed;
  }

  paintTerrainPath(document: MapDocument, request: TerrainPathRequest): boolean {
    if (request.points.length === 0) return false;

    let changed = false;
    for (let i = 0; i < request.points.length - 1; i += 1) {
      const start = request.points[i];
      const end = request.points[i + 1];
      if (!start || !end) continue;

      // Integer Bresenham keeps path painting deterministic and grid-native.
      let x = start.x;
      let y = start.y;
      const dx = Math.abs(end.x - start.x);
      const sx = start.x < end.x ? 1 : -1;
      const dy = -Math.abs(end.y - start.y);
      const sy = start.y < end.y ? 1 : -1;
      let error = dx + dy;

      while (true) {
        changed =
          this.paintTerrainBrush(document, {
            center: { x, y },
            terrainId: request.terrainId,
            size: request.width,
          }) || changed;

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
    }

    if (request.points.length === 1) {
      const point = request.points[0];
      if (point) {
        changed = this.paintTerrainBrush(document, {
          center: point,
          terrainId: request.terrainId,
          size: request.width,
        });
      }
    }

    return changed;
  }

  private paintCell(document: MapDocument, coord: GridCoord, terrainId: string): boolean {
    const cell = tileAt(document, coord);
    if (!cell || cell.terrainId === terrainId) return false;
    cell.terrainId = terrainId;
    return true;
  }
}
