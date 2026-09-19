import type { IWorldCatalog } from "../domain/catalog";
import { rasterizePolyline } from "../domain/grid";
import { cloneMap, type GridCoord, type MapDocument } from "../domain/map";
import type { PrefabDefinition } from "../domain/prefab";
import { EntityPlacementService } from "./PlacementService";
import { LogicalWorldPainter } from "./WorldPainter";

export interface PrefabPlacementResult {
  placed: boolean;
  reason?: string;
}

export interface IPrefabPlacer {
  place(
    document: MapDocument,
    prefab: PrefabDefinition,
    anchor: GridCoord,
  ): PrefabPlacementResult;
}

/**
 * Applies compound structures atomically.
 *
 * Prefabs are editor/generator recipes, not persistent map entities. After
 * placement the MapDocument still contains only ordinary semantic terrain,
 * props and actors, so gameplay and serialization do not depend on prefabs.
 */
export class PrefabPlacer implements IPrefabPlacer {
  readonly #placement: EntityPlacementService;
  readonly #terrain = new LogicalWorldPainter();

  constructor(private readonly catalog: IWorldCatalog) {
    this.#placement = new EntityPlacementService(catalog);
  }

  place(
    document: MapDocument,
    prefab: PrefabDefinition,
    anchor: GridCoord,
  ): PrefabPlacementResult {
    const validation = this.validatePrefab(prefab);
    if (validation) return { placed: false, reason: validation };

    if (
      anchor.x < 0 ||
      anchor.y < 0 ||
      anchor.x + prefab.width > document.width ||
      anchor.y + prefab.height > document.height
    ) {
      return { placed: false, reason: "Prefab footprint is outside the map." };
    }

    const candidate = cloneMap(document);

    for (const patch of prefab.terrain) {
      this.#terrain.paintTerrainRect(candidate, {
        from: { x: anchor.x + patch.x, y: anchor.y + patch.y },
        to: {
          x: anchor.x + patch.x + patch.width - 1,
          y: anchor.y + patch.y + patch.height - 1,
        },
        terrainId: patch.terrainId,
      });
    }

    for (const stamp of prefab.props) {
      const coord = { x: anchor.x + stamp.x, y: anchor.y + stamp.y };
      const placed = this.#placement.placeProp(candidate, {
        catalogId: stamp.catalogId,
        coord,
        overlapPolicy: prefab.overlapPolicy,
      });

      if (!placed && !this.samePropExists(candidate, stamp.catalogId, coord)) {
        return {
          placed: false,
          reason: `Could not place prop ${stamp.catalogId} at ${coord.x},${coord.y}.`,
        };
      }
    }

    for (const network of prefab.networks) {
      const definition = this.catalog.get(network.catalogId);
      if (!definition || definition.layer !== "prop" || !definition.network) {
        return {
          placed: false,
          reason: `Prefab network ${network.catalogId} is not a connected prop.`,
        };
      }

      for (const local of rasterizePolyline(network.points)) {
        const coord = { x: anchor.x + local.x, y: anchor.y + local.y };
        const placed = this.#placement.placeProp(candidate, {
          catalogId: network.catalogId,
          coord,
          overlapPolicy: prefab.overlapPolicy,
        });

        if (!placed && !this.samePropExists(candidate, network.catalogId, coord)) {
          return {
            placed: false,
            reason: `Could not place network ${network.catalogId} at ${coord.x},${coord.y}.`,
          };
        }
      }
    }

    for (const stamp of prefab.actors) {
      const coord = { x: anchor.x + stamp.x, y: anchor.y + stamp.y };
      const placed = this.#placement.placeActor(candidate, stamp.catalogId, coord);

      if (!placed && !this.sameActorExists(candidate, stamp.catalogId, coord)) {
        return {
          placed: false,
          reason: `Could not place actor ${stamp.catalogId} at ${coord.x},${coord.y}.`,
        };
      }

      if (stamp.facing) {
        const actor = candidate.actors.find(
          (item) =>
            item.catalogId === stamp.catalogId &&
            item.x === coord.x &&
            item.y === coord.y,
        );
        if (actor) actor.facing = stamp.facing;
      }
    }

    document.tiles = candidate.tiles;
    document.props = candidate.props;
    document.actors = candidate.actors;

    return { placed: true };
  }

  private validatePrefab(prefab: PrefabDefinition): string | undefined {
    if (prefab.width < 1 || prefab.height < 1) return "Prefab size must be positive.";

    for (const patch of prefab.terrain) {
      if (!this.catalog.get(patch.terrainId)) return `Unknown terrain ${patch.terrainId}.`;
      if (
        patch.width < 1 ||
        patch.height < 1 ||
        patch.x < 0 ||
        patch.y < 0 ||
        patch.x + patch.width > prefab.width ||
        patch.y + patch.height > prefab.height
      ) {
        return `Terrain patch ${patch.terrainId} is outside prefab bounds.`;
      }
    }

    for (const prop of prefab.props) {
      const definition = this.catalog.get(prop.catalogId);
      if (!definition || definition.layer !== "prop") return `Unknown prop ${prop.catalogId}.`;
      if (
        prop.x < 0 ||
        prop.y < 0 ||
        prop.x + definition.footprint.width > prefab.width ||
        prop.y + definition.footprint.height > prefab.height
      ) {
        return `Prop ${prop.catalogId} is outside prefab bounds.`;
      }
    }

    for (const network of prefab.networks) {
      if (
        network.points.some(
          (point) =>
            point.x < 0 ||
            point.y < 0 ||
            point.x >= prefab.width ||
            point.y >= prefab.height,
        )
      ) {
        return `Network ${network.catalogId} is outside prefab bounds.`;
      }
    }

    for (const actor of prefab.actors) {
      const definition = this.catalog.get(actor.catalogId);
      if (!definition || definition.layer !== "actor") return `Unknown actor ${actor.catalogId}.`;
      if (
        actor.x < 0 ||
        actor.y < 0 ||
        actor.x >= prefab.width ||
        actor.y >= prefab.height
      ) {
        return `Actor ${actor.catalogId} is outside prefab bounds.`;
      }
    }

    return undefined;
  }

  private samePropExists(document: MapDocument, catalogId: string, coord: GridCoord): boolean {
    return document.props.some(
      (prop) => prop.catalogId === catalogId && prop.x === coord.x && prop.y === coord.y,
    );
  }

  private sameActorExists(document: MapDocument, catalogId: string, coord: GridCoord): boolean {
    return document.actors.some(
      (actor) => actor.catalogId === catalogId && actor.x === coord.x && actor.y === coord.y,
    );
  }
}
