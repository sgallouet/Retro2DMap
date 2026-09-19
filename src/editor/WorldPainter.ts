import { rasterizePolyline } from "../domain/grid";
import {
  tileAt,
  type BrushSize,
  type GridCoord,
  type MapDocument,
} from "../domain/map";

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
    let changed = false;

    for (const coord of rasterizePolyline(request.points)) {
      changed =
        this.paintTerrainBrush(document, {
          center: coord,
          terrainId: request.terrainId,
          size: request.width,
        }) || changed;
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
