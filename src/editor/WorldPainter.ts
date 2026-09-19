import { rasterizePolyline } from "../domain/grid";
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
