import type { IWorldCatalog, PropDefinition } from "./catalog";
import { rotatedFootprint } from "./geometry";
import { tileIndex, type GridCoord, type MapDocument, type PropInstance } from "./map";
import { NavigationGridBuilder } from "./navigation";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  coord?: GridCoord;
  entityId?: string;
}

export interface IMapValidator {
  validate(document: MapDocument): readonly ValidationIssue[];
}

/**
 * Pure semantic validation. Issues refer to map concepts and coordinates, not
 * Phaser objects or sprite frames.
 */
export class MapValidator implements IMapValidator {
  readonly #navigation: NavigationGridBuilder;

  constructor(private readonly catalog: IWorldCatalog) {
    this.#navigation = new NavigationGridBuilder(catalog);
  }

  validate(document: MapDocument): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (
      !Number.isInteger(document.width) ||
      !Number.isInteger(document.height) ||
      document.width < 1 ||
      document.height < 1
    ) {
      issues.push({
        code: "invalid-map-size",
        severity: "error",
        message: "Map width and height must be positive integers.",
      });
      return issues;
    }

    if (document.tiles.length !== document.width * document.height) {
      issues.push({
        code: "terrain-size-mismatch",
        severity: "error",
        message: "Terrain cell count does not match map dimensions.",
      });
    }

    document.tiles.forEach((tile, index) => {
      if (!tile.terrainId) return;
      const definition = this.catalog.get(tile.terrainId);
      if (!definition || definition.layer !== "terrain") {
        issues.push({
          code: "unknown-terrain",
          severity: "error",
          message: `Unknown terrain '${tile.terrainId}'.`,
          coord: {
            x: index % document.width,
            y: Math.floor(index / document.width),
          },
        });
      }
    });

    for (const prop of document.props) {
      const definition = this.catalog.get(prop.catalogId);
      if (!definition || definition.layer !== "prop") {
        issues.push({
          code: "unknown-prop",
          severity: "error",
          message: `Unknown prop '${prop.catalogId}'.`,
          coord: { x: prop.x, y: prop.y },
          entityId: prop.id,
        });
        continue;
      }

      if (!this.propInside(document, prop, definition)) {
        issues.push({
          code: "prop-out-of-bounds",
          severity: "error",
          message: `Prop '${definition.label}' extends outside the map.`,
          coord: { x: prop.x, y: prop.y },
          entityId: prop.id,
        });
      }
    }

    for (let i = 0; i < document.props.length; i += 1) {
      const a = document.props[i];
      if (!a) continue;
      const aDefinition = this.catalog.get(a.catalogId);
      if (!aDefinition || aDefinition.layer !== "prop") continue;

      for (let j = i + 1; j < document.props.length; j += 1) {
        const b = document.props[j];
        if (!b) continue;
        const bDefinition = this.catalog.get(b.catalogId);
        if (!bDefinition || bDefinition.layer !== "prop") continue;

        if (this.propsOverlap(a, aDefinition, b, bDefinition)) {
          issues.push({
            code: "prop-overlap",
            severity: "error",
            message: `Props '${aDefinition.label}' and '${bDefinition.label}' overlap.`,
            coord: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
            entityId: a.id,
          });
        }
      }
    }

    const navigation = this.#navigation.build(document);

    for (const actor of document.actors) {
      const definition = this.catalog.get(actor.catalogId);
      if (!definition || definition.layer !== "actor") {
        issues.push({
          code: "unknown-actor",
          severity: "error",
          message: `Unknown actor '${actor.catalogId}'.`,
          coord: { x: actor.x, y: actor.y },
          entityId: actor.id,
        });
        continue;
      }

      const index = tileIndex(document, actor);
      if (index === null) {
        issues.push({
          code: "actor-out-of-bounds",
          severity: "error",
          message: `Actor '${definition.label}' is outside the map.`,
          coord: { x: actor.x, y: actor.y },
          entityId: actor.id,
        });
        continue;
      }

      if (!navigation.at(actor)?.walkable) {
        issues.push({
          code: "actor-on-blocked-cell",
          severity: "warning",
          message: `Actor '${definition.label}' is standing on a blocked cell.`,
          coord: { x: actor.x, y: actor.y },
          entityId: actor.id,
        });
      }
    }

    return issues;
  }

  private propInside(
    document: MapDocument,
    prop: PropInstance,
    definition: PropDefinition,
  ): boolean {
    const footprint = rotatedFootprint(
      definition.footprint,
      definition.rotatable ? prop.rotation : 0,
    );
    return (
      prop.x >= 0 &&
      prop.y >= 0 &&
      prop.x + footprint.width <= document.width &&
      prop.y + footprint.height <= document.height
    );
  }

  private propsOverlap(
    a: PropInstance,
    aDefinition: PropDefinition,
    b: PropInstance,
    bDefinition: PropDefinition,
  ): boolean {
    const aFootprint = rotatedFootprint(
      aDefinition.footprint,
      aDefinition.rotatable ? a.rotation : 0,
    );
    const bFootprint = rotatedFootprint(
      bDefinition.footprint,
      bDefinition.rotatable ? b.rotation : 0,
    );

    return (
      a.x < b.x + bFootprint.width &&
      a.x + aFootprint.width > b.x &&
      a.y < b.y + bFootprint.height &&
      a.y + aFootprint.height > b.y
    );
  }
}
