import type { QuarterTurn } from "./geometry";

export const TILE_SIZE = 48;
export const MAP_FORMAT_VERSION = 1 as const;

export type LayerKind = "terrain" | "prop" | "actor";
export type ToolKind = "paint" | "erase" | "select" | "route";
export type StrokeMode = "brush" | "line" | "rect";
export type BrushSize = 1 | 3 | 5;
export type OverlapPolicy = "replace" | "reject";

export interface GridCoord {
  x: number;
  y: number;
}

export interface TileCell {
  /** Omitted terrain is an intentionally transparent cell. */
  terrainId?: string;
}

export interface PropInstance {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  /**
   * Semantic orientation for non-network props. Optional keeps v1 map JSON
   * backward compatible; absence means 0 degrees.
   */
  rotation?: QuarterTurn;
}

export interface ActorInstance {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  facing: "north" | "east" | "south" | "west";
}

export interface EditorEntitySelection {
  kind: "prop" | "actor";
  id: string;
}

export interface MapDocument {
  version: typeof MAP_FORMAT_VERSION;
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileCell[];
  props: PropInstance[];
  actors: ActorInstance[];
}

export interface EditorSelection {
  layer: LayerKind;
  catalogId: string;
  tool: ToolKind;
  strokeMode: StrokeMode;
  brushSize: BrushSize;
}

export interface EditorSnapshot {
  document: MapDocument;
  selection: EditorSelection;
  gridVisible: boolean;
}

export function tileIndex(document: Pick<MapDocument, "width" | "height">, coord: GridCoord): number | null {
  if (coord.x < 0 || coord.y < 0 || coord.x >= document.width || coord.y >= document.height) {
    return null;
  }
  return coord.y * document.width + coord.x;
}

export function tileAt(document: MapDocument, coord: GridCoord): TileCell | undefined {
  const index = tileIndex(document, coord);
  return index === null ? undefined : document.tiles[index];
}

export function createBlankMap(width: number, height: number, terrainId = "grass"): MapDocument {
  return {
    version: MAP_FORMAT_VERSION,
    id: crypto.randomUUID(),
    name: "Untitled Kingdom",
    width,
    height,
    tiles: Array.from({ length: width * height }, () => ({ terrainId })),
    props: [],
    actors: [],
  };
}

export function cloneMap(document: MapDocument): MapDocument {
  return structuredClone(document);
}

export function validateMapDocument(value: unknown): MapDocument {
  if (!value || typeof value !== "object") throw new Error("Map JSON must be an object.");
  const candidate = value as Partial<MapDocument>;
  if (candidate.version !== MAP_FORMAT_VERSION) throw new Error("Unsupported map format version.");
  if (!Number.isInteger(candidate.width) || !Number.isInteger(candidate.height)) throw new Error("Invalid map size.");
  if (!candidate.width || !candidate.height || candidate.width < 1 || candidate.height < 1) throw new Error("Map size must be positive.");
  if (!Array.isArray(candidate.tiles) || candidate.tiles.length !== candidate.width * candidate.height) {
    throw new Error("Terrain cell count does not match map dimensions.");
  }
  if (candidate.tiles.some((tile) =>
    !tile || typeof tile !== "object" ||
    ("terrainId" in tile && tile.terrainId !== undefined && typeof tile.terrainId !== "string"))) {
    throw new Error("Invalid terrain cell.");
  }
  if (!Array.isArray(candidate.props) || !Array.isArray(candidate.actors)) throw new Error("Props and actors must be arrays.");
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") throw new Error("Map id/name missing.");
  return candidate as MapDocument;
}
