import type { IWorldCatalog, TerrainDefinition } from "./catalog";
import { tileAt, type GridCoord, type MapDocument } from "./map";

export const NORTH = 1 << 0;
export const EAST = 1 << 1;
export const SOUTH = 1 << 2;
export const WEST = 1 << 3;
export const ALL_CARDINAL = NORTH | EAST | SOUTH | WEST;

export type CardinalMask = number;

export interface TerrainRenderContext {
  /**
   * Bitmask of N/E/S/W neighbors that visually connect to this terrain.
   * Kept independent from Phaser and sprite atlases so the same semantic
   * topology can drive procedural art today and authored atlas frames later.
   */
  neighborMask: CardinalMask;
  /**
   * Deterministic visual-noise variant. This does not affect gameplay.
   */
  variation: number;
}

export interface ITerrainTopologyResolver {
  resolve(document: MapDocument, coord: GridCoord, terrain: TerrainDefinition): TerrainRenderContext;
}

const hash = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export class TerrainTopologyResolver implements ITerrainTopologyResolver {
  constructor(private readonly catalog: IWorldCatalog) {}

  resolve(document: MapDocument, coord: GridCoord, terrain: TerrainDefinition): TerrainRenderContext {
    let neighborMask = 0;

    if (this.connects(document, { x: coord.x, y: coord.y - 1 }, terrain)) neighborMask |= NORTH;
    if (this.connects(document, { x: coord.x + 1, y: coord.y }, terrain)) neighborMask |= EAST;
    if (this.connects(document, { x: coord.x, y: coord.y + 1 }, terrain)) neighborMask |= SOUTH;
    if (this.connects(document, { x: coord.x - 1, y: coord.y }, terrain)) neighborMask |= WEST;

    return {
      neighborMask,
      variation: hash(`${terrain.id}:${coord.x}:${coord.y}`) % 4,
    };
  }

  private connects(document: MapDocument, coord: GridCoord, terrain: TerrainDefinition): boolean {
    const cell = tileAt(document, coord);

    // Treat outside-of-map as connected so the visible world edge does not
    // acquire an artificial decorative border.
    if (!cell) return true;

    const neighbor = this.catalog.get(cell.terrainId);
    return neighbor?.layer === "terrain" && neighbor.connectGroup === terrain.connectGroup;
  }
}
