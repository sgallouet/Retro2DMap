import type { IWorldCatalog, PropDefinition, TerrainDefinition } from "./catalog";
import { tileAt, type GridCoord, type MapDocument, type PropInstance } from "./map";

export const NORTH = 1 << 0;
export const EAST = 1 << 1;
export const SOUTH = 1 << 2;
export const WEST = 1 << 3;

export const NORTH_EAST = 1 << 4;
export const SOUTH_EAST = 1 << 5;
export const SOUTH_WEST = 1 << 6;
export const NORTH_WEST = 1 << 7;

export const ALL_CARDINAL = NORTH | EAST | SOUTH | WEST;
export const ALL_DIAGONAL = NORTH_EAST | SOUTH_EAST | SOUTH_WEST | NORTH_WEST;
export const ALL_NEIGHBORS = ALL_CARDINAL | ALL_DIAGONAL;

export type CardinalMask = number;
export type NeighborMask = number;
export type CornerMask = number;

export type NetworkRole =
  | "isolated"
  | "end"
  | "straight"
  | "corner"
  | "tee"
  | "cross";

export interface TerrainRenderContext {
  /** Full 8-neighbour connectivity: N/E/S/W + four diagonals. */
  neighborMask: NeighborMask;
  /** Fast four-direction subset used for edges and corridor-like topology. */
  cardinalMask: CardinalMask;
  /**
   * Diagonal bits representing concave/inner corners:
   * both adjacent cardinal neighbours connect, but the diagonal does not.
   */
  innerCornerMask: CornerMask;
  /** Stable atlas-friendly key derived only from semantic topology. */
  topologyKey: string;
  /** Deterministic cosmetic variant. Never gameplay-relevant. */
  variation: number;
}

export interface NetworkRenderContext {
  neighborMask: CardinalMask;
  role: NetworkRole;
  rotation: 0 | 90 | 180 | 270;
  topologyKey: string;
}

export interface ITerrainTopologyResolver {
  resolve(document: MapDocument, coord: GridCoord, terrain: TerrainDefinition): TerrainRenderContext;
}

export interface IPropTopologyResolver {
  resolve(
    document: MapDocument,
    prop: PropInstance,
    definition: PropDefinition,
  ): NetworkRenderContext | undefined;
}

const hash = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const cardinalMaskOf = (neighborMask: NeighborMask): CardinalMask =>
  neighborMask & ALL_CARDINAL;

export const innerCornerMaskOf = (neighborMask: NeighborMask): CornerMask => {
  const cardinal = cardinalMaskOf(neighborMask);
  let result = 0;

  if (
    (cardinal & NORTH) !== 0 &&
    (cardinal & EAST) !== 0 &&
    (neighborMask & NORTH_EAST) === 0
  ) {
    result |= NORTH_EAST;
  }
  if (
    (cardinal & EAST) !== 0 &&
    (cardinal & SOUTH) !== 0 &&
    (neighborMask & SOUTH_EAST) === 0
  ) {
    result |= SOUTH_EAST;
  }
  if (
    (cardinal & SOUTH) !== 0 &&
    (cardinal & WEST) !== 0 &&
    (neighborMask & SOUTH_WEST) === 0
  ) {
    result |= SOUTH_WEST;
  }
  if (
    (cardinal & WEST) !== 0 &&
    (cardinal & NORTH) !== 0 &&
    (neighborMask & NORTH_WEST) === 0
  ) {
    result |= NORTH_WEST;
  }

  return result;
};

export const terrainTopologyKey = (neighborMask: NeighborMask): string => {
  const cardinal = cardinalMaskOf(neighborMask);
  const inner = innerCornerMaskOf(neighborMask);
  return `c${cardinal}-i${inner}`;
};

/**
 * Returns every distinct topology key the 8-neighbour resolver can emit.
 * This lets asset providers prebuild only meaningful variants instead of
 * naively allocating all 256 masks.
 */
export const enumerateTerrainTopologies = (): readonly Readonly<{
  cardinalMask: CardinalMask;
  innerCornerMask: CornerMask;
  topologyKey: string;
}>[] => {
  const unique = new Map<string, { cardinalMask: number; innerCornerMask: number; topologyKey: string }>();

  for (let mask = 0; mask <= ALL_NEIGHBORS; mask += 1) {
    const cardinalMask = cardinalMaskOf(mask);
    const innerCornerMask = innerCornerMaskOf(mask);
    const topologyKey = terrainTopologyKey(mask);
    if (!unique.has(topologyKey)) {
      unique.set(topologyKey, { cardinalMask, innerCornerMask, topologyKey });
    }
  }

  return [...unique.values()];
};

export const classifyNetwork = (neighborMask: CardinalMask): NetworkRenderContext => {
  const mask = neighborMask & ALL_CARDINAL;
  const connections = [NORTH, EAST, SOUTH, WEST].filter((bit) => (mask & bit) !== 0).length;

  if (connections === 0) {
    return { neighborMask: mask, role: "isolated", rotation: 0, topologyKey: "isolated" };
  }

  if (connections === 1) {
    const rotation: 0 | 90 | 180 | 270 =
      (mask & NORTH) !== 0 ? 0 : (mask & EAST) !== 0 ? 90 : (mask & SOUTH) !== 0 ? 180 : 270;
    return { neighborMask: mask, role: "end", rotation, topologyKey: `end-${rotation}` };
  }

  if (connections === 2) {
    if ((mask & (NORTH | SOUTH)) === (NORTH | SOUTH)) {
      return { neighborMask: mask, role: "straight", rotation: 0, topologyKey: "straight-0" };
    }
    if ((mask & (EAST | WEST)) === (EAST | WEST)) {
      return { neighborMask: mask, role: "straight", rotation: 90, topologyKey: "straight-90" };
    }

    const rotation: 0 | 90 | 180 | 270 =
      (mask & (NORTH | EAST)) === (NORTH | EAST)
        ? 0
        : (mask & (EAST | SOUTH)) === (EAST | SOUTH)
          ? 90
          : (mask & (SOUTH | WEST)) === (SOUTH | WEST)
            ? 180
            : 270;
    return { neighborMask: mask, role: "corner", rotation, topologyKey: `corner-${rotation}` };
  }

  if (connections === 3) {
    const rotation: 0 | 90 | 180 | 270 =
      (mask & SOUTH) === 0 ? 0 : (mask & WEST) === 0 ? 90 : (mask & NORTH) === 0 ? 180 : 270;
    return { neighborMask: mask, role: "tee", rotation, topologyKey: `tee-${rotation}` };
  }

  return { neighborMask: mask, role: "cross", rotation: 0, topologyKey: "cross" };
};

export class TerrainTopologyResolver implements ITerrainTopologyResolver {
  constructor(private readonly catalog: IWorldCatalog) {}

  resolve(document: MapDocument, coord: GridCoord, terrain: TerrainDefinition): TerrainRenderContext {
    let neighborMask = 0;

    if (this.connects(document, { x: coord.x, y: coord.y - 1 }, terrain)) neighborMask |= NORTH;
    if (this.connects(document, { x: coord.x + 1, y: coord.y }, terrain)) neighborMask |= EAST;
    if (this.connects(document, { x: coord.x, y: coord.y + 1 }, terrain)) neighborMask |= SOUTH;
    if (this.connects(document, { x: coord.x - 1, y: coord.y }, terrain)) neighborMask |= WEST;

    if (this.connects(document, { x: coord.x + 1, y: coord.y - 1 }, terrain)) neighborMask |= NORTH_EAST;
    if (this.connects(document, { x: coord.x + 1, y: coord.y + 1 }, terrain)) neighborMask |= SOUTH_EAST;
    if (this.connects(document, { x: coord.x - 1, y: coord.y + 1 }, terrain)) neighborMask |= SOUTH_WEST;
    if (this.connects(document, { x: coord.x - 1, y: coord.y - 1 }, terrain)) neighborMask |= NORTH_WEST;

    return {
      neighborMask,
      cardinalMask: cardinalMaskOf(neighborMask),
      innerCornerMask: innerCornerMaskOf(neighborMask),
      topologyKey: terrainTopologyKey(neighborMask),
      variation: hash(`${terrain.id}:${coord.x}:${coord.y}`) % 4,
    };
  }

  private connects(document: MapDocument, coord: GridCoord, terrain: TerrainDefinition): boolean {
    const cell = tileAt(document, coord);

    // Treat outside-of-map as connected so the map boundary does not create
    // an accidental decorative coastline/border.
    if (!cell) return true;

    const neighbor = this.catalog.get(cell.terrainId);
    return neighbor?.layer === "terrain" && neighbor.connectGroup === terrain.connectGroup;
  }
}

export class PropTopologyResolver implements IPropTopologyResolver {
  constructor(private readonly catalog: IWorldCatalog) {}

  resolve(
    document: MapDocument,
    prop: PropInstance,
    definition: PropDefinition,
  ): NetworkRenderContext | undefined {
    const group = definition.network?.group;
    if (!group) return undefined;

    let mask = 0;
    if (this.connectedAt(document, prop.id, { x: prop.x, y: prop.y - 1 }, group)) mask |= NORTH;
    if (this.connectedAt(document, prop.id, { x: prop.x + 1, y: prop.y }, group)) mask |= EAST;
    if (this.connectedAt(document, prop.id, { x: prop.x, y: prop.y + 1 }, group)) mask |= SOUTH;
    if (this.connectedAt(document, prop.id, { x: prop.x - 1, y: prop.y }, group)) mask |= WEST;

    return classifyNetwork(mask);
  }

  private connectedAt(
    document: MapDocument,
    sourcePropId: string,
    coord: GridCoord,
    group: string,
  ): boolean {
    return document.props.some((candidate) => {
      if (candidate.id === sourcePropId) return false;

      const definition = this.catalog.get(candidate.catalogId);
      if (!definition || definition.layer !== "prop" || definition.network?.group !== group) return false;

      return (
        coord.x >= candidate.x &&
        coord.y >= candidate.y &&
        coord.x < candidate.x + definition.footprint.width &&
        coord.y < candidate.y + definition.footprint.height
      );
    });
  }
}
