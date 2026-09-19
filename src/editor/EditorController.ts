import { History } from "../core/History";
import type { IWorldCatalog } from "../domain/catalog";
import {
  cloneMap,
  type BrushSize,
  type EditorSelection,
  type GridCoord,
  type LayerKind,
  type MapDocument,
  type StrokeMode,
} from "../domain/map";
import { EntityPlacementService } from "./PlacementService";
import { LogicalWorldPainter } from "./WorldPainter";

export interface EditorState {
  document: MapDocument;
  selection: EditorSelection;
  gridVisible: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export type EditorListener = (state: Readonly<EditorState>) => void;

export interface IEditorController {
  readonly state: Readonly<EditorState>;
  subscribe(listener: EditorListener): () => void;
  select(layer: LayerKind, catalogId: string): void;
  setTool(tool: EditorSelection["tool"]): void;
  setStrokeMode(mode: StrokeMode): void;
  setBrushSize(size: BrushSize): void;
  setGridVisible(visible: boolean): void;
  beginStroke(): void;
  applyAt(coord: GridCoord, eraseOverride?: boolean): void;
  applyLine(from: GridCoord, to: GridCoord, eraseOverride?: boolean): void;
  endStroke(): void;
  undo(): void;
  redo(): void;
  replaceDocument(document: MapDocument): void;
}

export class EditorController implements IEditorController {
  #document: MapDocument;
  #selection: EditorSelection = {
    layer: "terrain",
    catalogId: "grass",
    tool: "paint",
    strokeMode: "brush",
    brushSize: 1,
  };
  #gridVisible = false;
  #strokeActive = false;
  readonly #listeners = new Set<EditorListener>();
  readonly #history = new History<MapDocument>(cloneMap);
  readonly #worldPainter = new LogicalWorldPainter();
  readonly #placement: EntityPlacementService;

  constructor(document: MapDocument, private readonly catalog: IWorldCatalog) {
    this.#document = cloneMap(document);
    this.#placement = new EntityPlacementService(catalog);
  }

  get state(): Readonly<EditorState> {
    return {
      document: this.#document,
      selection: this.#selection,
      gridVisible: this.#gridVisible,
      canUndo: this.#history.canUndo,
      canRedo: this.#history.canRedo,
    };
  }

  subscribe(listener: EditorListener): () => void {
    this.#listeners.add(listener);
    listener(this.state);
    return () => this.#listeners.delete(listener);
  }

  select(layer: LayerKind, catalogId: string): void {
    const item = this.catalog.get(catalogId);
    if (!item || item.layer !== layer) throw new Error(`Catalog item ${catalogId} is not on layer ${layer}.`);
    const supportsLine =
      layer === "terrain" || (item.layer === "prop" && item.network !== undefined);
    this.#selection = {
      ...this.#selection,
      layer,
      catalogId,
      strokeMode: supportsLine ? this.#selection.strokeMode : "brush",
    };
    this.emit();
  }

  setTool(tool: EditorSelection["tool"]): void {
    this.#selection = { ...this.#selection, tool };
    this.emit();
  }

  setStrokeMode(mode: StrokeMode): void {
    const selected = this.catalog.get(this.#selection.catalogId);
    const supportsLine =
      this.#selection.layer === "terrain" ||
      (selected?.layer === "prop" && selected.network !== undefined);
    this.#selection = {
      ...this.#selection,
      strokeMode: supportsLine ? mode : "brush",
    };
    this.emit();
  }

  setBrushSize(size: BrushSize): void {
    this.#selection = { ...this.#selection, brushSize: size };
    this.emit();
  }

  setGridVisible(visible: boolean): void {
    this.#gridVisible = visible;
    this.emit();
  }

  beginStroke(): void {
    if (this.#strokeActive) return;
    this.#strokeActive = true;
    this.#history.checkpoint(this.#document);
    this.emit();
  }

  applyAt(coord: GridCoord, eraseOverride = false): void {
    const erase = eraseOverride || this.#selection.tool === "erase";
    const changed = erase ? this.eraseAt(coord) : this.paintAt(coord);
    if (changed) this.emit();
  }

  applyLine(from: GridCoord, to: GridCoord, eraseOverride = false): void {
    const erase = eraseOverride || this.#selection.tool === "erase";
    let changed = false;

    if (this.#selection.layer === "terrain") {
      changed = this.#worldPainter.paintTerrainPath(this.#document, {
        points: [from, to],
        terrainId: erase ? "grass" : this.#selection.catalogId,
        width: this.#selection.brushSize,
      });
    } else if (this.#selection.layer === "prop") {
      changed = erase
        ? this.#placement.erasePropsPath(this.#document, [from, to])
        : this.#placement.paintNetworkPath(this.#document, {
            catalogId: this.#selection.catalogId,
            points: [from, to],
            overlapPolicy: "replace",
          });
    }

    if (changed) this.emit();
  }

  endStroke(): void {
    this.#strokeActive = false;
  }

  undo(): void {
    const previous = this.#history.undo(this.#document);
    if (!previous) return;
    this.#document = previous;
    this.emit();
  }

  redo(): void {
    const next = this.#history.redo(this.#document);
    if (!next) return;
    this.#document = next;
    this.emit();
  }

  replaceDocument(document: MapDocument): void {
    this.#document = cloneMap(document);
    this.#history.clear();
    this.#strokeActive = false;
    this.emit();
  }

  private paintAt(coord: GridCoord): boolean {
    if (this.#selection.layer === "terrain") {
      return this.#worldPainter.paintTerrainBrush(this.#document, {
        center: coord,
        terrainId: this.#selection.catalogId,
        size: this.#selection.brushSize,
      });
    }

    if (coord.x < 0 || coord.y < 0 || coord.x >= this.#document.width || coord.y >= this.#document.height) {
      return false;
    }

    if (this.#selection.layer === "actor") {
      return this.#placement.placeActor(
        this.#document,
        this.#selection.catalogId,
        coord,
      );
    }

    return this.#placement.placeProp(this.#document, {
      catalogId: this.#selection.catalogId,
      coord,
      overlapPolicy: "replace",
    });
  }

  private eraseAt(coord: GridCoord): boolean {
    if (this.#selection.layer === "terrain") {
      return this.#worldPainter.paintTerrainBrush(this.#document, {
        center: coord,
        terrainId: "grass",
        size: this.#selection.brushSize,
      });
    }

    if (this.#selection.layer === "actor") {
      return this.#placement.eraseActorsAt(this.#document, coord);
    }

    return this.#placement.erasePropsAt(this.#document, coord);
  }

  private emit(): void {
    const state = this.state;
    this.#listeners.forEach((listener) => listener(state));
  }
}
