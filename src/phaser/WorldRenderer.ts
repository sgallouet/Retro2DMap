import Phaser from "phaser";
import type { IWorldCatalog, PropDefinition } from "../domain/catalog";
import { PropTopologyResolver, TerrainTopologyResolver } from "../domain/autotile";
import type { EditorSelection, GridCoord, MapDocument } from "../domain/map";
import { TILE_SIZE } from "../domain/map";
import type { IAssetProvider } from "./IAssetProvider";

export interface IWorldRenderer {
  render(document: MapDocument, gridVisible: boolean): void;
  setHover(coord: GridCoord | null, selection: EditorSelection): void;
  destroy(): void;
}

export class WorldRenderer implements IWorldRenderer {
  readonly #worldObjects: Phaser.GameObjects.GameObject[] = [];
  readonly #grid: Phaser.GameObjects.Graphics;
  readonly #hover: Phaser.GameObjects.Graphics;
  readonly #terrainTopology: TerrainTopologyResolver;
  readonly #propTopology: PropTopologyResolver;
  #lastDocument: MapDocument | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly catalog: IWorldCatalog,
    private readonly assets: IAssetProvider,
  ) {
    this.#grid = scene.add.graphics().setDepth(100_000);
    this.#hover = scene.add.graphics().setDepth(100_100);
    this.#terrainTopology = new TerrainTopologyResolver(catalog);
    this.#propTopology = new PropTopologyResolver(catalog);
  }

  render(document: MapDocument, gridVisible: boolean): void {
    this.#lastDocument = document;
    this.#worldObjects.splice(0).forEach((object) => object.destroy());

    for (let y = 0; y < document.height; y += 1) {
      for (let x = 0; x < document.width; x += 1) {
        const cell = document.tiles[y * document.width + x];
        if (!cell) continue;
        const definition = this.catalog.get(cell.terrainId);
        if (!definition || definition.layer !== "terrain") continue;
        const image = this.scene.add
          .image(
            x * TILE_SIZE,
            y * TILE_SIZE,
            this.assets.textureKey(definition, x, y, {
              terrain: this.#terrainTopology.resolve(document, { x, y }, definition),
            }),
          )
          .setOrigin(0, 0)
          .setDepth(0);
        this.#worldObjects.push(image);
      }
    }

    document.props.forEach((prop) => {
      const definition = this.catalog.get(prop.catalogId);
      if (!definition || definition.layer !== "prop") return;
      const propDefinition = definition as PropDefinition;
      const image = this.scene.add
        .image(
          prop.x * TILE_SIZE,
          prop.y * TILE_SIZE,
          this.assets.textureKey(definition, prop.x, prop.y, {
            network: this.#propTopology.resolve(document, prop, propDefinition),
          }),
        )
        .setOrigin(0, 0)
        .setDepth(
          1_000 +
            (prop.y + propDefinition.footprint.height) * TILE_SIZE +
            propDefinition.depthBias,
        );
      this.#worldObjects.push(image);
    });

    document.actors.forEach((actor) => {
      const definition = this.catalog.get(actor.catalogId);
      if (!definition || definition.layer !== "actor") return;
      const image = this.scene.add
        .image(actor.x * TILE_SIZE, actor.y * TILE_SIZE, this.assets.textureKey(definition, actor.x, actor.y))
        .setOrigin(0, 0)
        .setDepth(1_000 + (actor.y + 1) * TILE_SIZE + 10);
      if (actor.facing === "west") image.setFlipX(true);
      this.#worldObjects.push(image);
    });

    this.drawGrid(document, gridVisible);
  }

  setHover(coord: GridCoord | null, selection: EditorSelection): void {
    this.#hover.clear();
    const document = this.#lastDocument;
    if (!coord || !document) return;
    if (coord.x < 0 || coord.y < 0 || coord.x >= document.width || coord.y >= document.height) return;

    let width: number = selection.layer === "terrain" ? selection.brushSize : 1;
    let height: number = selection.layer === "terrain" ? selection.brushSize : 1;
    let anchorX = coord.x;
    let anchorY = coord.y;
    const definition = this.catalog.get(selection.catalogId);
    if (definition?.layer === "prop") {
      width = definition.footprint.width;
      height = definition.footprint.height;
    } else if (selection.layer === "terrain") {
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

  destroy(): void {
    this.#worldObjects.splice(0).forEach((object) => object.destroy());
    this.#grid.destroy();
    this.#hover.destroy();
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
