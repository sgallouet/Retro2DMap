import type { IWorldCatalog } from "../domain/catalog";
import type {
  CommandBatchResult,
  CommandExecutionResult,
  WorldCommand,
} from "../domain/commands";
import {
  cloneMap,
  type GridCoord,
  type MapDocument,
} from "../domain/map";
import type { IPrefabCatalog } from "../domain/prefab";
import { EntityPlacementService } from "./PlacementService";
import { PrefabPlacer } from "./PrefabPlacer";
import { LogicalWorldPainter } from "./WorldPainter";

export interface IWorldCommandExecutor {
  execute(document: MapDocument, command: WorldCommand): CommandExecutionResult;
  executeAtomic(
    document: MapDocument,
    commands: readonly WorldCommand[],
  ): CommandBatchResult;
}

/**
 * Serializable semantic commands -> the same painter/placement services used
 * by the interactive editor.
 *
 * This is the boundary intended for procedural generators, tests, server-side
 * tools and future AI map builders. Commands never mention Phaser or sprites.
 */
export class WorldCommandExecutor implements IWorldCommandExecutor {
  readonly #terrain = new LogicalWorldPainter();
  readonly #placement: EntityPlacementService;
  readonly #prefabs: PrefabPlacer;

  constructor(
    private readonly catalog: IWorldCatalog,
    private readonly prefabCatalog: IPrefabCatalog,
  ) {
    this.#placement = new EntityPlacementService(catalog);
    this.#prefabs = new PrefabPlacer(catalog);
  }

  execute(document: MapDocument, command: WorldCommand): CommandExecutionResult {
    switch (command.type) {
      case "paint-terrain-rect": {
        const terrain = this.catalog.get(command.terrainId);
        if (!terrain || terrain.layer !== "terrain") {
          return this.failure(`Unknown terrain '${command.terrainId}'.`);
        }

        const changed = this.#terrain.paintTerrainRect(document, {
          from: command.from,
          to: command.to,
          terrainId: command.terrainId,
        });
        return { ok: true, changed };
      }

      case "paint-terrain-path": {
        const terrain = this.catalog.get(command.terrainId);
        if (!terrain || terrain.layer !== "terrain") {
          return this.failure(`Unknown terrain '${command.terrainId}'.`);
        }
        if (command.points.length === 0) {
          return this.failure("Terrain path requires at least one point.");
        }

        const changed = this.#terrain.paintTerrainPath(document, {
          points: command.points,
          terrainId: command.terrainId,
          width: command.width,
        });
        return { ok: true, changed };
      }

      case "place-prop": {
        const definition = this.catalog.get(command.catalogId);
        if (!definition || definition.layer !== "prop") {
          return this.failure(`Unknown prop '${command.catalogId}'.`);
        }

        const changed = this.#placement.placeProp(document, {
          catalogId: command.catalogId,
          coord: command.coord,
          overlapPolicy: command.overlapPolicy ?? "reject",
        });

        if (changed) return { ok: true, changed: true };
        if (this.samePropExists(document, command.catalogId, command.coord)) {
          return { ok: true, changed: false };
        }
        return this.failure(`Could not place prop '${command.catalogId}'.`);
      }

      case "place-network-path": {
        const definition = this.catalog.get(command.catalogId);
        if (!definition || definition.layer !== "prop" || !definition.network) {
          return this.failure(`'${command.catalogId}' is not a connected prop network.`);
        }
        if (command.points.length === 0) {
          return this.failure("Network path requires at least one point.");
        }

        const changed = this.#placement.paintNetworkPath(document, {
          catalogId: command.catalogId,
          points: command.points,
          overlapPolicy: command.overlapPolicy ?? "reject",
        });
        return { ok: true, changed };
      }

      case "place-actor": {
        const definition = this.catalog.get(command.catalogId);
        if (!definition || definition.layer !== "actor") {
          return this.failure(`Unknown actor '${command.catalogId}'.`);
        }

        const changed = this.#placement.placeActor(
          document,
          command.catalogId,
          command.coord,
        );

        const actor = document.actors.find(
          (candidate) =>
            candidate.catalogId === command.catalogId &&
            candidate.x === command.coord.x &&
            candidate.y === command.coord.y,
        );

        if (!changed && !actor) {
          return this.failure(`Could not place actor '${command.catalogId}'.`);
        }

        let facingChanged = false;
        if (actor && command.facing && actor.facing !== command.facing) {
          actor.facing = command.facing;
          facingChanged = true;
        }

        return { ok: true, changed: changed || facingChanged };
      }

      case "place-prefab": {
        const prefab = this.prefabCatalog.get(command.prefabId);
        if (!prefab) return this.failure(`Unknown prefab '${command.prefabId}'.`);

        const result = this.#prefabs.place(document, prefab, command.anchor);
        return result.placed
          ? { ok: true, changed: true }
          : this.failure(result.reason ?? `Could not place prefab '${command.prefabId}'.`);
      }
    }
  }

  executeAtomic(
    document: MapDocument,
    commands: readonly WorldCommand[],
  ): CommandBatchResult {
    const candidate = cloneMap(document);
    const results: CommandExecutionResult[] = [];
    let changed = false;

    for (let index = 0; index < commands.length; index += 1) {
      const command = commands[index];
      if (!command) continue;

      const result = this.execute(candidate, command);
      results.push(result);

      if (!result.ok) {
        return {
          ok: false,
          changed: false,
          results,
          failedAt: index,
        };
      }

      changed = result.changed || changed;
    }

    if (changed) {
      document.tiles = candidate.tiles;
      document.props = candidate.props;
      document.actors = candidate.actors;
    }

    return { ok: true, changed, results };
  }

  private samePropExists(
    document: MapDocument,
    catalogId: string,
    coord: GridCoord,
  ): boolean {
    return document.props.some(
      (prop) =>
        prop.catalogId === catalogId &&
        prop.x === coord.x &&
        prop.y === coord.y,
    );
  }

  private failure(reason: string): CommandExecutionResult {
    return { ok: false, changed: false, reason };
  }
}
