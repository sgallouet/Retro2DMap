import type { IWorldCatalog } from "./catalog";
import { rotatedFootprint } from "./geometry";
import { tileIndex, type GridCoord, type MapDocument } from "./map";

export interface NavigationCell {
  walkable: boolean;
  movementCost: number;
  blockedBy: readonly string[];
}

export interface NavigationGrid {
  width: number;
  height: number;
  cells: readonly NavigationCell[];
  at(coord: GridCoord): NavigationCell | undefined;
}

export interface NavigationBuildOptions {
  actorsBlockMovement?: boolean;
}

/**
 * Derives gameplay navigation from semantic map state.
 *
 * Navigation is deliberately not stored in MapDocument. Terrain, props and
 * actors are the source of truth; this projection can be rebuilt whenever the
 * world changes.
 */
export class NavigationGridBuilder {
  constructor(private readonly catalog: IWorldCatalog) {}

  build(
    document: MapDocument,
    options: NavigationBuildOptions = {},
  ): NavigationGrid {
    const mutable = document.tiles.map((tile) => {
      const terrain = tile.terrainId ? this.catalog.get(tile.terrainId) : undefined;
      if (!terrain || terrain.layer !== "terrain") {
        return {
          walkable: false,
          movementCost: Number.POSITIVE_INFINITY,
          blockedBy: [tile.terrainId ? "unknown-terrain" : "empty-terrain"],
        };
      }

      return {
        walkable: terrain.walkable,
        movementCost: terrain.movementCost,
        blockedBy: terrain.walkable ? [] : [`terrain:${terrain.id}`],
      };
    });

    // Traversal surfaces such as bridges can intentionally override an
    // otherwise unwalkable base terrain (for example water).
    for (const prop of document.props) {
      const definition = this.catalog.get(prop.catalogId);
      if (
        !definition ||
        definition.layer !== "prop" ||
        definition.network?.kind !== "bridge"
      ) {
        continue;
      }

      const footprint = rotatedFootprint(
        definition.footprint,
        definition.rotatable ? prop.rotation : 0,
      );
      this.forEachFootprintCell(document, prop.x, prop.y, footprint, (index) => {
        mutable[index] = {
          walkable: true,
          movementCost: 1,
          blockedBy: [],
        };
      });
    }

    // Blocking props win over traversal surfaces, independent of insertion
    // order in the map document.
    for (const prop of document.props) {
      const definition = this.catalog.get(prop.catalogId);
      if (!definition || definition.layer !== "prop" || !definition.blocksMovement) {
        continue;
      }

      const footprint = rotatedFootprint(
        definition.footprint,
        definition.rotatable ? prop.rotation : 0,
      );
      this.forEachFootprintCell(document, prop.x, prop.y, footprint, (index) => {
        const current = mutable[index];
        if (!current) return;
        mutable[index] = {
          ...current,
          walkable: false,
          movementCost: Number.POSITIVE_INFINITY,
          blockedBy: [...current.blockedBy, `prop:${prop.id}`],
        };
      });
    }

    if (options.actorsBlockMovement) {
      for (const actor of document.actors) {
        const index = tileIndex(document, actor);
        if (index === null) continue;
        const current = mutable[index];
        if (!current) continue;

        mutable[index] = {
          ...current,
          walkable: false,
          movementCost: Number.POSITIVE_INFINITY,
          blockedBy: [...current.blockedBy, `actor:${actor.id}`],
        };
      }
    }

    return {
      width: document.width,
      height: document.height,
      cells: mutable,
      at: (coord) => {
        const index = tileIndex(document, coord);
        return index === null ? undefined : mutable[index];
      },
    };
  }

  private forEachFootprintCell(
    document: MapDocument,
    x: number,
    y: number,
    footprint: Readonly<{ width: number; height: number }>,
    visit: (index: number) => void,
  ): void {
    for (let dy = 0; dy < footprint.height; dy += 1) {
      for (let dx = 0; dx < footprint.width; dx += 1) {
        const index = tileIndex(document, { x: x + dx, y: y + dy });
        if (index !== null) visit(index);
      }
    }
  }
}
