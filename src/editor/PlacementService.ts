import type { IWorldCatalog, PropDefinition } from "../domain/catalog";
import { rasterizePolyline } from "../domain/grid";
import {
  cloneMap,
  type ActorInstance,
  type GridCoord,
  type MapDocument,
  type OverlapPolicy,
  type PropInstance,
} from "../domain/map";

export interface PropPlacementRequest {
  catalogId: string;
  coord: GridCoord;
  overlapPolicy?: OverlapPolicy;
}

export interface NetworkPathRequest {
  catalogId: string;
  points: readonly GridCoord[];
  overlapPolicy?: OverlapPolicy;
}

export interface IEntityPlacementService {
  placeProp(document: MapDocument, request: PropPlacementRequest): boolean;
  erasePropsAt(document: MapDocument, coord: GridCoord): boolean;
  paintNetworkPath(document: MapDocument, request: NetworkPathRequest): boolean;
  erasePropsPath(document: MapDocument, points: readonly GridCoord[]): boolean;
  moveProp(
    document: MapDocument,
    propId: string,
    coord: GridCoord,
    overlapPolicy?: OverlapPolicy,
  ): boolean;
  placeActor(document: MapDocument, catalogId: string, coord: GridCoord): boolean;
  moveActor(document: MapDocument, actorId: string, coord: GridCoord): boolean;
  eraseActorsAt(document: MapDocument, coord: GridCoord): boolean;
  propOccupies(prop: PropInstance, coord: GridCoord): boolean;
}

export class EntityPlacementService implements IEntityPlacementService {
  constructor(private readonly catalog: IWorldCatalog) {}

  placeProp(document: MapDocument, request: PropPlacementRequest): boolean {
    const definition = this.catalog.get(request.catalogId);
    if (!definition || definition.layer !== "prop") return false;
    if (!this.footprintInside(document, request.coord, definition)) return false;

    const same = document.props.some(
      (prop) =>
        prop.x === request.coord.x &&
        prop.y === request.coord.y &&
        prop.catalogId === request.catalogId,
    );
    if (same) return false;

    const overlaps = document.props.filter((prop) =>
      this.propsOverlap(prop, request.coord, definition),
    );

    if ((request.overlapPolicy ?? "replace") === "reject" && overlaps.length > 0) {
      return false;
    }

    const overlapIds = new Set(overlaps.map((prop) => prop.id));
    document.props = document.props.filter((prop) => !overlapIds.has(prop.id));
    document.props.push({
      id: crypto.randomUUID(),
      catalogId: request.catalogId,
      x: request.coord.x,
      y: request.coord.y,
    });
    return true;
  }

  erasePropsAt(document: MapDocument, coord: GridCoord): boolean {
    const next = document.props.filter((prop) => !this.propOccupies(prop, coord));
    if (next.length === document.props.length) return false;
    document.props = next;
    return true;
  }

  paintNetworkPath(document: MapDocument, request: NetworkPathRequest): boolean {
    const definition = this.catalog.get(request.catalogId);
    if (!definition || definition.layer !== "prop" || !definition.network) return false;

    const overlapPolicy = request.overlapPolicy ?? "replace";
    const target = overlapPolicy === "reject" ? cloneMap(document) : document;
    let changed = false;

    for (const coord of rasterizePolyline(request.points)) {
      const placed = this.placeProp(target, {
        catalogId: request.catalogId,
        coord,
        overlapPolicy,
      });

      if (!placed) {
        const same = target.props.some(
          (prop) =>
            prop.catalogId === request.catalogId &&
            prop.x === coord.x &&
            prop.y === coord.y,
        );

        if (!same && overlapPolicy === "reject") return false;
      }

      changed = placed || changed;
    }

    if (overlapPolicy === "reject" && changed) {
      document.props = target.props;
    }

    return changed;
  }

  erasePropsPath(document: MapDocument, points: readonly GridCoord[]): boolean {
    let changed = false;
    for (const coord of rasterizePolyline(points)) {
      changed = this.erasePropsAt(document, coord) || changed;
    }
    return changed;
  }

  moveProp(
    document: MapDocument,
    propId: string,
    coord: GridCoord,
    overlapPolicy: OverlapPolicy = "reject",
  ): boolean {
    const prop = document.props.find((item) => item.id === propId);
    if (!prop) return false;

    const definition = this.catalog.get(prop.catalogId);
    if (!definition || definition.layer !== "prop") return false;
    if (!this.footprintInside(document, coord, definition)) return false;
    if (prop.x === coord.x && prop.y === coord.y) return false;

    const overlaps = document.props.filter(
      (candidate) =>
        candidate.id !== propId &&
        this.propsOverlap(candidate, coord, definition),
    );

    if (overlapPolicy === "reject" && overlaps.length > 0) return false;

    if (overlapPolicy === "replace") {
      const overlapIds = new Set(overlaps.map((candidate) => candidate.id));
      document.props = document.props.filter(
        (candidate) => candidate.id === propId || !overlapIds.has(candidate.id),
      );
    }

    prop.x = coord.x;
    prop.y = coord.y;
    return true;
  }

  placeActor(document: MapDocument, catalogId: string, coord: GridCoord): boolean {
    const definition = this.catalog.get(catalogId);
    if (!definition || definition.layer !== "actor" || !this.coordInside(document, coord)) {
      return false;
    }

    const same = document.actors.some(
      (actor) =>
        actor.x === coord.x &&
        actor.y === coord.y &&
        actor.catalogId === catalogId,
    );
    if (same) return false;

    document.actors = document.actors.filter(
      (actor) => actor.x !== coord.x || actor.y !== coord.y,
    );

    const actor: ActorInstance = {
      id: crypto.randomUUID(),
      catalogId,
      x: coord.x,
      y: coord.y,
      facing: "south",
    };
    document.actors.push(actor);
    return true;
  }

  moveActor(document: MapDocument, actorId: string, coord: GridCoord): boolean {
    const actor = document.actors.find((item) => item.id === actorId);
    if (!actor || !this.coordInside(document, coord)) return false;
    if (actor.x === coord.x && actor.y === coord.y) return false;

    const occupied = document.actors.some(
      (candidate) =>
        candidate.id !== actorId &&
        candidate.x === coord.x &&
        candidate.y === coord.y,
    );
    if (occupied) return false;

    actor.x = coord.x;
    actor.y = coord.y;
    return true;
  }

  eraseActorsAt(document: MapDocument, coord: GridCoord): boolean {
    const next = document.actors.filter(
      (actor) => actor.x !== coord.x || actor.y !== coord.y,
    );
    if (next.length === document.actors.length) return false;
    document.actors = next;
    return true;
  }

  propOccupies(prop: PropInstance, coord: GridCoord): boolean {
    const definition = this.catalog.get(prop.catalogId);
    if (!definition || definition.layer !== "prop") return false;

    return (
      coord.x >= prop.x &&
      coord.y >= prop.y &&
      coord.x < prop.x + definition.footprint.width &&
      coord.y < prop.y + definition.footprint.height
    );
  }

  private footprintInside(
    document: MapDocument,
    coord: GridCoord,
    definition: PropDefinition,
  ): boolean {
    return (
      coord.x >= 0 &&
      coord.y >= 0 &&
      coord.x + definition.footprint.width <= document.width &&
      coord.y + definition.footprint.height <= document.height
    );
  }

  private coordInside(document: MapDocument, coord: GridCoord): boolean {
    return (
      coord.x >= 0 &&
      coord.y >= 0 &&
      coord.x < document.width &&
      coord.y < document.height
    );
  }

  private propsOverlap(
    existing: PropInstance,
    nextCoord: GridCoord,
    nextDefinition: PropDefinition,
  ): boolean {
    const existingDefinition = this.catalog.get(existing.catalogId);
    if (!existingDefinition || existingDefinition.layer !== "prop") return false;

    return (
      existing.x < nextCoord.x + nextDefinition.footprint.width &&
      existing.x + existingDefinition.footprint.width > nextCoord.x &&
      existing.y < nextCoord.y + nextDefinition.footprint.height &&
      existing.y + existingDefinition.footprint.height > nextCoord.y
    );
  }
}
