import Phaser from "phaser";
import type { IWorldCatalog } from "../domain/catalog";
import type { IPrefabCatalog } from "../domain/prefab";
import type { IEditorController } from "../editor/EditorController";
import {
  TILE_SIZE,
  type EditorEntitySelection,
  type EditorSelection,
  type GridCoord,
  type MapDocument,
} from "../domain/map";
import type { IAssetProvider } from "./IAssetProvider";
import { WorldRenderer } from "./WorldRenderer";

export interface MapSceneDependencies {
  editor: IEditorController;
  catalog: IWorldCatalog;
  prefabs: IPrefabCatalog;
  assets: IAssetProvider;
}

export class MapScene extends Phaser.Scene {
  readonly #editor: IEditorController;
  readonly #catalog: IWorldCatalog;
  readonly #prefabs: IPrefabCatalog;
  readonly #assets: IAssetProvider;

  #renderer?: WorldRenderer;
  #unsubscribe?: () => void;
  #painting = false;
  #eraseOverride = false;
  #panning = false;
  #spaceDown = false;
  #lastHover: GridCoord | null = null;
  #gestureStart: GridCoord | null = null;
  #selectedPrefabId: string | null = null;
  #entitySelection: EditorEntitySelection | null = null;
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
    this.#prefabs = dependencies.prefabs;
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
      this.#selectedPrefabId = state.selectedPrefabId;
      this.#entitySelection = state.entitySelection;
      this.#renderer?.render(
        state.document,
        state.gridVisible,
        state.navigationVisible,
        state.entitySelection,
      );
      const prefab = state.selectedPrefabId ? this.#prefabs.get(state.selectedPrefabId) : undefined;
      const selectedFootprint =
        state.selection.tool === "select"
          ? this.entityFootprint(state.document, state.entitySelection)
          : undefined;
      this.#renderer?.setHover(
        this.#lastHover,
        state.selection,
        prefab
          ? { width: prefab.width, height: prefab.height }
          : selectedFootprint,
      );
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

      if (this.#selection.tool === "select") {
        if (!pointer.leftButtonDown()) return;
        this.#painting = true;
        this.#eraseOverride = false;
        this.#gestureStart = coord;
        this.#editor.selectEntityAt(coord);
        return;
      }

      this.#painting = true;
      this.#eraseOverride = pointer.rightButtonDown();
      this.#editor.beginStroke();

      if (this.#selectedPrefabId) {
        this.#editor.applyAt(coord, this.#eraseOverride);
      } else if (this.#selection.strokeMode === "line") {
        this.#gestureStart = coord;
        this.#renderer?.setLinePreview(coord, coord, this.#selection);
      } else if (this.#selection.strokeMode === "rect") {
        this.#gestureStart = coord;
        this.#renderer?.setRectPreview(coord, coord, this.#selection);
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
        const prefab = this.#selectedPrefabId ? this.#prefabs.get(this.#selectedPrefabId) : undefined;
        const selectedFootprint =
          this.#selection.tool === "select"
            ? this.entityFootprint(this.#editor.state.document, this.#entitySelection)
            : undefined;
        this.#renderer?.setHover(
          coord,
          this.#selection,
          prefab
            ? { width: prefab.width, height: prefab.height }
            : selectedFootprint,
        );
      }

      if (
        this.#painting &&
        this.#selection.tool !== "select" &&
        !this.#selectedPrefabId &&
        this.#selection.strokeMode === "brush"
      ) {
        this.applyPointer(pointer);
      } else if (
        this.#painting &&
        !this.#selectedPrefabId &&
        this.#selection.strokeMode === "line" &&
        this.#gestureStart &&
        coord
      ) {
        this.#renderer?.setLinePreview(this.#gestureStart, coord, this.#selection);
      } else if (
        this.#painting &&
        !this.#selectedPrefabId &&
        this.#selection.strokeMode === "rect" &&
        this.#gestureStart &&
        coord
      ) {
        this.#renderer?.setRectPreview(this.#gestureStart, coord, this.#selection);
      }
    });

    const finishPointer = (pointer: Phaser.Input.Pointer): void => {
      if (this.#painting && this.#selection.tool === "select") {
        const end = this.pointerToGrid(pointer) ?? this.#lastHover ?? this.#gestureStart;
        if (
          this.#gestureStart &&
          end &&
          this.#entitySelection &&
          !this.sameCoord(this.#gestureStart, end)
        ) {
          this.#editor.beginStroke();
          this.#editor.moveSelectedEntity(end);
          this.#editor.endStroke();
        }

        this.#painting = false;
        this.#eraseOverride = false;
        this.#panning = false;
        this.#gestureStart = null;
        this.#renderer?.clearLinePreview();
        return;
      }

      if (this.#painting && !this.#selectedPrefabId && this.#gestureStart) {
        const end = this.pointerToGrid(pointer) ?? this.#lastHover ?? this.#gestureStart;
        if (this.#selection.strokeMode === "line") {
          this.#editor.applyLine(this.#gestureStart, end, this.#eraseOverride);
        } else if (this.#selection.strokeMode === "rect") {
          this.#editor.applyRect(this.#gestureStart, end, this.#eraseOverride);
        }
      }

      if (this.#painting) this.#editor.endStroke();
      this.#painting = false;
      this.#eraseOverride = false;
      this.#panning = false;
      this.#gestureStart = null;
      this.#renderer?.clearLinePreview();
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
    keyboard.on("keydown-N", (event: KeyboardEvent) => {
      if (event.repeat) return;
      this.#editor.setNavigationVisible(!this.#editor.state.navigationVisible);
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

  private entityFootprint(
    document: MapDocument,
    selection: EditorEntitySelection | null,
  ): Readonly<{ width: number; height: number }> | undefined {
    if (!selection) return undefined;
    if (selection.kind === "actor") return { width: 1, height: 1 };

    const prop = document.props.find((candidate) => candidate.id === selection.id);
    if (!prop) return undefined;

    const definition = this.#catalog.get(prop.catalogId);
    if (!definition || definition.layer !== "prop") return undefined;
    return {
      width: definition.footprint.width,
      height: definition.footprint.height,
    };
  }

  private updateCameraBounds(document: MapDocument): void {
    this.cameras.main.setBounds(0, 0, document.width * TILE_SIZE, document.height * TILE_SIZE);
  }

  private sameCoord(a: GridCoord | null, b: GridCoord | null): boolean {
    return a?.x === b?.x && a?.y === b?.y;
  }
}
