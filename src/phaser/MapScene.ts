import Phaser from "phaser";
import type { IWorldCatalog } from "../domain/catalog";
import type { IEditorController } from "../editor/EditorController";
import { TILE_SIZE, type EditorSelection, type GridCoord, type MapDocument } from "../domain/map";
import type { IAssetProvider } from "./IAssetProvider";
import { WorldRenderer } from "./WorldRenderer";

export interface MapSceneDependencies {
  editor: IEditorController;
  catalog: IWorldCatalog;
  assets: IAssetProvider;
}

export class MapScene extends Phaser.Scene {
  readonly #editor: IEditorController;
  readonly #catalog: IWorldCatalog;
  readonly #assets: IAssetProvider;

  #renderer?: WorldRenderer;
  #unsubscribe?: () => void;
  #painting = false;
  #eraseOverride = false;
  #panning = false;
  #spaceDown = false;
  #lastHover: GridCoord | null = null;
  #lineStart: GridCoord | null = null;
  #selection: EditorSelection = {
    layer: "terrain",
    catalogId: "grass",
    tool: "paint",
    strokeMode: "brush",
    brushSize: 1,
  };

  constructor(dependencies: MapSceneDependencies) {
    super({ key: "MapScene" });
    this.#editor = dependencies.editor;
    this.#catalog = dependencies.catalog;
    this.#assets = dependencies.assets;
  }

  preload(): void {
    this.#assets.preload(this, this.#catalog);
  }

  create(): void {
    this.#assets.prepare(this, this.#catalog);
    this.#renderer = new WorldRenderer(this, this.#catalog, this.#assets);
    this.input.mouse?.disableContextMenu();

    this.#unsubscribe = this.#editor.subscribe((state) => {
      this.#selection = state.selection;
      this.#renderer?.render(state.document, state.gridVisible);
      this.#renderer?.setHover(this.#lastHover, state.selection);
      this.updateCameraBounds(state.document);
    });

    this.cameras.main.setZoom(0.85);
    this.cameras.main.centerOn(18 * TILE_SIZE, 12 * TILE_SIZE);

    this.bindPointerControls();
    this.bindKeyboardControls();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.#unsubscribe?.();
      this.#renderer?.destroy();
    });
  }

  private bindPointerControls(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const panRequested = pointer.middleButtonDown() || (this.#spaceDown && pointer.leftButtonDown());
      if (panRequested) {
        this.#panning = true;
        return;
      }

      if (!pointer.leftButtonDown() && !pointer.rightButtonDown()) return;
      const coord = this.pointerToGrid(pointer);
      if (!coord) return;

      this.#painting = true;
      this.#eraseOverride = pointer.rightButtonDown();
      this.#editor.beginStroke();

      if (this.#selection.strokeMode === "line") {
        this.#lineStart = coord;
      } else {
        this.#editor.applyAt(coord, this.#eraseOverride);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.#panning) {
        const dx = pointer.x - pointer.prevPosition.x;
        const dy = pointer.y - pointer.prevPosition.y;
        const camera = this.cameras.main;
        camera.scrollX -= dx / camera.zoom;
        camera.scrollY -= dy / camera.zoom;
        return;
      }

      const coord = this.pointerToGrid(pointer);
      if (!this.sameCoord(coord, this.#lastHover)) {
        this.#lastHover = coord;
        this.#renderer?.setHover(coord, this.#selection);
      }

      if (this.#painting && this.#selection.strokeMode === "brush") this.applyPointer(pointer);
    });

    const finishPointer = (pointer: Phaser.Input.Pointer): void => {
      if (this.#painting && this.#selection.strokeMode === "line" && this.#lineStart) {
        const end = this.pointerToGrid(pointer) ?? this.#lastHover ?? this.#lineStart;
        this.#editor.applyLine(this.#lineStart, end, this.#eraseOverride);
      }

      if (this.#painting) this.#editor.endStroke();
      this.#painting = false;
      this.#eraseOverride = false;
      this.#panning = false;
      this.#lineStart = null;
    };

    this.input.on("pointerup", finishPointer);
    this.input.on("pointerupoutside", finishPointer);

    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _objects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        const camera = this.cameras.main;
        const before = camera.getWorldPoint(pointer.x, pointer.y);
        const nextZoom = Phaser.Math.Clamp(camera.zoom * (deltaY > 0 ? 0.9 : 1.1), 0.45, 2.4);
        camera.setZoom(nextZoom);
        const after = camera.getWorldPoint(pointer.x, pointer.y);
        camera.scrollX += before.x - after.x;
        camera.scrollY += before.y - after.y;
      },
    );
  }

  private bindKeyboardControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on("keydown-SPACE", () => {
      this.#spaceDown = true;
    });
    keyboard.on("keyup-SPACE", () => {
      this.#spaceDown = false;
      this.#panning = false;
    });
    keyboard.on("keydown-G", (event: KeyboardEvent) => {
      if (event.repeat) return;
      this.#editor.setGridVisible(!this.#editor.state.gridVisible);
    });
    keyboard.on("keydown-Z", (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (event.shiftKey) this.#editor.redo();
      else this.#editor.undo();
    });
    keyboard.on("keydown-Y", (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      this.#editor.redo();
    });
  }

  private applyPointer(pointer: Phaser.Input.Pointer): void {
    const coord = this.pointerToGrid(pointer);
    if (!coord) return;
    this.#editor.applyAt(coord, this.#eraseOverride);
  }

  private pointerToGrid(pointer: Phaser.Input.Pointer): GridCoord | null {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const x = Math.floor(world.x / TILE_SIZE);
    const y = Math.floor(world.y / TILE_SIZE);
    const document = this.#editor.state.document;
    if (x < 0 || y < 0 || x >= document.width || y >= document.height) return null;
    return { x, y };
  }

  private updateCameraBounds(document: MapDocument): void {
    this.cameras.main.setBounds(0, 0, document.width * TILE_SIZE, document.height * TILE_SIZE);
  }

  private sameCoord(a: GridCoord | null, b: GridCoord | null): boolean {
    return a?.x === b?.x && a?.y === b?.y;
  }
}
