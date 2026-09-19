import Phaser from "phaser";
import type { IWorldCatalog, PropDefinition } from "../domain/catalog";
import { PropTopologyResolver, TerrainTopologyResolver } from "../domain/autotile";
import { rotatedFootprint } from "../domain/geometry";
import { rasterizeGridLine } from "../domain/grid";
import { NavigationGridBuilder } from "../domain/navigation";
import type { ValidationIssue } from "../domain/validation";
import type { EditorEntitySelection, EditorSelection, GridCoord, MapDocument } from "../domain/map";
import { TILE_SIZE } from "../domain/map";
import type { IAssetProvider } from "./IAssetProvider";

export interface IWorldRenderer {
  render(
    document: MapDocument,
    gridVisible: boolean,
    navigationVisible: boolean,
    entitySelection: EditorEntitySelection | null,
    validationIssues: readonly ValidationIssue[],
    routePath: readonly GridCoord[],
  ): void;
  setHover(
    coord: GridCoord | null,
    selection: EditorSelection,
    footprintOverride?: Readonly<{ width: number; height: number }>,
  ): void;
  setLinePreview(from: GridCoord, to: GridCoord, selection: EditorSelection): void;
  setRectPreview(from: GridCoord, to: GridCoord, selection: EditorSelection): void;
  clearLinePreview(): void;
  destroy(): void;
}

export class WorldRenderer implements IWorldRenderer {
  readonly #worldObjects: Phaser.GameObjects.GameObject[] = [];
  readonly #navigationOverlay: Phaser.GameObjects.Graphics;
  readonly #validationOverlay: Phaser.GameObjects.Graphics;
  readonly #routeOverlay: Phaser.GameObjects.Graphics;
  readonly #entitySelectionOverlay: Phaser.GameObjects.Graphics;
  readonly #grid: Phaser.GameObjects.Graphics;
  readonly #linePreview: Phaser.GameObjects.Graphics;
  readonly #hover: Phaser.GameObjects.Graphics;
  readonly #terrainTopology: TerrainTopologyResolver;
  readonly #propTopology: PropTopologyResolver;
  readonly #navigation: NavigationGridBuilder;
  #lastDocument: MapDocument | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly catalog: IWorldCatalog,
    private readonly assets: IAssetProvider,
  ) {
    this.#navigationOverlay = scene.add.graphics().setDepth(99_900);
    this.#validationOverlay = scene.add.graphics().setDepth(99_930);
    this.#routeOverlay = scene.add.graphics().setDepth(99_940);
    this.#entitySelectionOverlay = scene.add.graphics().setDepth(99_950);
    this.#grid = scene.add.graphics().setDepth(100_000);
    this.#linePreview = scene.add.graphics().setDepth(100_050);
    this.#hover = scene.add.graphics().setDepth(100_100);
    this.#terrainTopology = new TerrainTopologyResolver(catalog);
    this.#propTopology = new PropTopologyResolver(catalog);
    this.#navigation = new NavigationGridBuilder(catalog);
  }

  render(
    document: MapDocument,
    gridVisible: boolean,
    navigationVisible: boolean,
    entitySelection: EditorEntitySelection | null,
    validationIssues: readonly ValidationIssue[],
    routePath: readonly GridCoord[],
  ): void {
    this.#lastDocument = document;
    this.#worldObjects.splice(0).forEach((object) => object.destroy());

    for (let y = 0; y < document.height; y += 1) {
      for (let x = 0; x < document.width; x += 1) {
        const cell = document.tiles[y * document.width + x];
        if (!cell) continue;
        const definition = this.catalog.get(cell.terrainId);
        if (!definition || definition.layer !== "terrain") continue;
        const texture = this.assets.textureRef(definition, x, y, {
          terrain: this.#terrainTopology.resolve(document, { x, y }, definition),
        });
        const image = this.scene.add
          .image(x * TILE_SIZE, y * TILE_SIZE, texture.key, texture.frame)
          .setOrigin(0, 0)
          .setDepth(0);
        this.#worldObjects.push(image);
      }
    }

    document.props.forEach((prop) => {
      const definition = this.catalog.get(prop.catalogId);
      if (!definition || definition.layer !== "prop") return;
      const propDefinition = definition as PropDefinition;
      const network = this.#propTopology.resolve(document, prop, propDefinition);
      const rotation = propDefinition.rotatable ? (prop.rotation ?? 0) : 0;
      const footprint = rotatedFootprint(propDefinition.footprint, rotation);
      const texture = this.assets.textureRef(
        definition,
        prop.x,
        prop.y,
        network ? { network } : undefined,
      );
      const image = this.scene.add
        .image(
          (prop.x + footprint.width / 2) * TILE_SIZE,
          (prop.y + footprint.height / 2) * TILE_SIZE,
          texture.key,
          texture.frame,
        )
        .setOrigin(0.5, 0.5)
        .setAngle(rotation)
        .setDepth(
          1_000 +
            (prop.y + footprint.height) * TILE_SIZE +
            propDefinition.depthBias,
        );
      this.#worldObjects.push(image);
    });

    document.actors.forEach((actor) => {
      const definition = this.catalog.get(actor.catalogId);
      if (!definition || definition.layer !== "actor") return;
      const texture = this.assets.textureRef(definition, actor.x, actor.y, {
        actor: { facing: actor.facing },
      });
      const image = this.scene.add
        .image(actor.x * TILE_SIZE, actor.y * TILE_SIZE, texture.key, texture.frame)
        .setOrigin(0, 0)
        .setDepth(1_000 + (actor.y + 1) * TILE_SIZE + 10);
      if (actor.facing === "west") image.setFlipX(true);
      this.#worldObjects.push(image);
    });

    this.drawNavigation(document, navigationVisible);
    this.drawValidation(validationIssues);
    this.drawRoute(routePath);
    this.drawEntitySelection(document, entitySelection);
    this.drawGrid(document, gridVisible);
  }

  setHover(
    coord: GridCoord | null,
    selection: EditorSelection,
    footprintOverride?: Readonly<{ width: number; height: number }>,
  ): void {
    this.#hover.clear();
    const document = this.#lastDocument;
    if (!coord || !document) return;
    if (coord.x < 0 || coord.y < 0 || coord.x >= document.width || coord.y >= document.height) return;

    let width: number = footprintOverride?.width ?? (selection.layer === "terrain" ? selection.brushSize : 1);
    let height: number = footprintOverride?.height ?? (selection.layer === "terrain" ? selection.brushSize : 1);
    let anchorX = coord.x;
    let anchorY = coord.y;
    const definition = this.catalog.get(selection.catalogId);

    if (!footprintOverride && definition?.layer === "prop") {
      width = definition.footprint.width;
      height = definition.footprint.height;
    } else if (!footprintOverride && selection.layer === "terrain") {
      const radius = Math.floor(selection.brushSize / 2);
      anchorX -= radius;
      anchorY -= radius;
    }

    const valid =
      anchorX >= 0 &&
      anchorY >= 0 &&
      anchorX + width <= document.width &&
      anchorY + height <= document.height;
    const fill = selection.tool === "erase" ? 0xd14747 : valid ? 0xf5e09b : 0xd14747;
    this.#hover.fillStyle(fill, 0.15);
    this.#hover.fillRect(anchorX * TILE_SIZE, anchorY * TILE_SIZE, width * TILE_SIZE, height * TILE_SIZE);
    this.#hover.lineStyle(2, fill, 0.95);
    this.#hover.strokeRect(
      anchorX * TILE_SIZE + 1,
      anchorY * TILE_SIZE + 1,
      width * TILE_SIZE - 2,
      height * TILE_SIZE - 2,
    );
  }

  setLinePreview(
    from: GridCoord,
    to: GridCoord,
    selection: EditorSelection,
  ): void {
    this.#linePreview.clear();
    const document = this.#lastDocument;
    if (!document) return;

    const fill = selection.tool === "erase" ? 0xd14747 : 0xf5e09b;
    const cells = new Set<string>();
    const radius = selection.layer === "terrain" ? Math.floor(selection.brushSize / 2) : 0;

    for (const point of rasterizeGridLine(from, to)) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const x = point.x + dx;
          const y = point.y + dy;
          if (x < 0 || y < 0 || x >= document.width || y >= document.height) continue;
          cells.add(`${x}:${y}`);
        }
      }
    }

    this.#linePreview.fillStyle(fill, 0.18);
    this.#linePreview.lineStyle(1, fill, 0.65);

    for (const key of cells) {
      const [rawX, rawY] = key.split(":");
      const x = Number(rawX);
      const y = Number(rawY);
      this.#linePreview.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      this.#linePreview.strokeRect(
        x * TILE_SIZE + 1,
        y * TILE_SIZE + 1,
        TILE_SIZE - 2,
        TILE_SIZE - 2,
      );
    }
  }

  setRectPreview(
    from: GridCoord,
    to: GridCoord,
    selection: EditorSelection,
  ): void {
    this.#linePreview.clear();
    const document = this.#lastDocument;
    if (!document) return;

    const fill = selection.tool === "erase" ? 0xd14747 : 0xf5e09b;
    const minX = Math.max(0, Math.min(from.x, to.x));
    const maxX = Math.min(document.width - 1, Math.max(from.x, to.x));
    const minY = Math.max(0, Math.min(from.y, to.y));
    const maxY = Math.min(document.height - 1, Math.max(from.y, to.y));

    this.#linePreview.fillStyle(fill, 0.18);
    this.#linePreview.lineStyle(1, fill, 0.65);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        this.#linePreview.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        this.#linePreview.strokeRect(
          x * TILE_SIZE + 1,
          y * TILE_SIZE + 1,
          TILE_SIZE - 2,
          TILE_SIZE - 2,
        );
      }
    }
  }

  clearLinePreview(): void {
    this.#linePreview.clear();
  }

  destroy(): void {
    this.#worldObjects.splice(0).forEach((object) => object.destroy());
    this.#navigationOverlay.destroy();
    this.#validationOverlay.destroy();
    this.#routeOverlay.destroy();
    this.#entitySelectionOverlay.destroy();
    this.#grid.destroy();
    this.#linePreview.destroy();
    this.#hover.destroy();
  }

  private drawValidation(issues: readonly ValidationIssue[]): void {
    this.#validationOverlay.clear();
    if (issues.length === 0) return;

    for (const issue of issues) {
      if (!issue.coord) continue;
      const color = issue.severity === "error" ? 0xe45c5c : 0xe2b74e;
      const inset = issue.severity === "error" ? 5 : 9;

      this.#validationOverlay.fillStyle(color, 0.22);
      this.#validationOverlay.lineStyle(2, color, 0.9);
      this.#validationOverlay.fillRect(
        issue.coord.x * TILE_SIZE + inset,
        issue.coord.y * TILE_SIZE + inset,
        TILE_SIZE - inset * 2,
        TILE_SIZE - inset * 2,
      );
      this.#validationOverlay.strokeRect(
        issue.coord.x * TILE_SIZE + inset,
        issue.coord.y * TILE_SIZE + inset,
        TILE_SIZE - inset * 2,
        TILE_SIZE - inset * 2,
      );
    }
  }

  private drawRoute(path: readonly GridCoord[]): void {
    this.#routeOverlay.clear();
    if (path.length === 0) return;

    this.#routeOverlay.lineStyle(5, 0x62d0de, 0.9);
    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i];
      const to = path[i + 1];
      if (!from || !to) continue;
      this.#routeOverlay.lineBetween(
        from.x * TILE_SIZE + TILE_SIZE / 2,
        from.y * TILE_SIZE + TILE_SIZE / 2,
        to.x * TILE_SIZE + TILE_SIZE / 2,
        to.y * TILE_SIZE + TILE_SIZE / 2,
      );
    }

    path.forEach((coord, index) => {
      const radius = index === 0 || index === path.length - 1 ? 7 : 4;
      this.#routeOverlay.fillStyle(0xb8f2f6, 0.95);
      this.#routeOverlay.fillCircle(
        coord.x * TILE_SIZE + TILE_SIZE / 2,
        coord.y * TILE_SIZE + TILE_SIZE / 2,
        radius,
      );
    });
  }

  private drawEntitySelection(
    document: MapDocument,
    selection: EditorEntitySelection | null,
  ): void {
    this.#entitySelectionOverlay.clear();
    if (!selection) return;

    let x = 0;
    let y = 0;
    let width = 1;
    let height = 1;

    if (selection.kind === "actor") {
      const actor = document.actors.find((candidate) => candidate.id === selection.id);
      if (!actor) return;
      x = actor.x;
      y = actor.y;
    } else {
      const prop = document.props.find((candidate) => candidate.id === selection.id);
      if (!prop) return;
      const definition = this.catalog.get(prop.catalogId);
      if (!definition || definition.layer !== "prop") return;

      x = prop.x;
      y = prop.y;
      const footprint = rotatedFootprint(
        definition.footprint,
        definition.rotatable ? prop.rotation : 0,
      );
      width = footprint.width;
      height = footprint.height;
    }

    const inset = 2;
    this.#entitySelectionOverlay.fillStyle(0xf2cf71, 0.10);
    this.#entitySelectionOverlay.lineStyle(3, 0xf2cf71, 0.95);
    this.#entitySelectionOverlay.fillRect(
      x * TILE_SIZE + inset,
      y * TILE_SIZE + inset,
      width * TILE_SIZE - inset * 2,
      height * TILE_SIZE - inset * 2,
    );
    this.#entitySelectionOverlay.strokeRect(
      x * TILE_SIZE + inset,
      y * TILE_SIZE + inset,
      width * TILE_SIZE - inset * 2,
      height * TILE_SIZE - inset * 2,
    );
  }

  private drawNavigation(document: MapDocument, visible: boolean): void {
    this.#navigationOverlay.clear();
    if (!visible) return;

    const navigation = this.#navigation.build(document);
    this.#navigationOverlay.fillStyle(0xd65353, 0.27);
    this.#navigationOverlay.lineStyle(1, 0xf18c8c, 0.45);

    for (let y = 0; y < navigation.height; y += 1) {
      for (let x = 0; x < navigation.width; x += 1) {
        const cell = navigation.at({ x, y });
        if (!cell || cell.walkable) continue;

        const inset = 4;
        this.#navigationOverlay.fillRect(
          x * TILE_SIZE + inset,
          y * TILE_SIZE + inset,
          TILE_SIZE - inset * 2,
          TILE_SIZE - inset * 2,
        );
        this.#navigationOverlay.strokeRect(
          x * TILE_SIZE + inset,
          y * TILE_SIZE + inset,
          TILE_SIZE - inset * 2,
          TILE_SIZE - inset * 2,
        );
      }
    }
  }

  private drawGrid(document: MapDocument, visible: boolean): void {
    this.#grid.clear();
    if (!visible) return;

    this.#grid.lineStyle(1, 0x15211a, 0.28);
    const width = document.width * TILE_SIZE;
    const height = document.height * TILE_SIZE;
    for (let x = 0; x <= document.width; x += 1) {
      this.#grid.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, height);
    }
    for (let y = 0; y <= document.height; y += 1) {
      this.#grid.lineBetween(0, y * TILE_SIZE, width, y * TILE_SIZE);
    }
  }
}
