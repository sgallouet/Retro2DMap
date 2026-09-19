import { History } from "../core/History";
import type { IWorldCatalog, PropDefinition } from "../domain/catalog";
import {
  cloneMap,
  type BrushSize,
  type EditorSelection,
  type GridCoord,
  type LayerKind,
  type MapDocument,
} from "../domain/map";
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
  setBrushSize(size: BrushSize): void;
  setGridVisible(visible: boolean): void;
  beginStroke(): void;
  applyAt(coord: GridCoord, eraseOverride?: boolean): void;
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
    brushSize: 1,
  };
  #gridVisible = false;
  #strokeActive = false;
  readonly #listeners = new Set<EditorListener>();
  readonly #history = new History<MapDocument>(cloneMap);
  readonly #worldPainter = new LogicalWorldPainter();

  constructor(document: MapDocument, private readonly catalog: IWorldCatalog) {
    this.#document = cloneMap(document);
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
    this.#selection = { ...this.#selection, layer, catalogId };
    this.emit();
  }

  setTool(tool: EditorSelection["tool"]): void {
    this.#selection = { ...this.#selection, tool };
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
      const existing = this.#document.actors.find(
        (actor) => actor.x === coord.x && actor.y === coord.y && actor.catalogId === this.#selection.catalogId,
      );
      if (existing) return false;
      this.#document.actors = this.#document.actors.filter((actor) => actor.x !== coord.x || actor.y !== coord.y);
      this.#document.actors.push({
        id: crypto.randomUUID(),
        catalogId: this.#selection.catalogId,
        x: coord.x,
        y: coord.y,
        facing: "south",
      });
      return true;
    }

    const definition = this.catalog.get(this.#selection.catalogId);
    if (!definition || definition.layer !== "prop") return false;
    const propDefinition = definition as PropDefinition;
    if (
      coord.x + propDefinition.footprint.width > this.#document.width ||
      coord.y + propDefinition.footprint.height > this.#document.height
    ) {
      return false;
    }

    const same = this.#document.props.find(
      (prop) => prop.x === coord.x && prop.y === coord.y && prop.catalogId === this.#selection.catalogId,
    );
    if (same) return false;

    this.#document.props = this.#document.props.filter((prop) => !this.propsOverlap(prop, coord, propDefinition));
    this.#document.props.push({
      id: crypto.randomUUID(),
      catalogId: this.#selection.catalogId,
      x: coord.x,
      y: coord.y,
    });
    return true;
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
      const next = this.#document.actors.filter((actor) => actor.x !== coord.x || actor.y !== coord.y);
      if (next.length === this.#document.actors.length) return false;
      this.#document.actors = next;
      return true;
    }

    const next = this.#document.props.filter((prop) => !this.propOccupies(prop, coord));
    if (next.length === this.#document.props.length) return false;
    this.#document.props = next;
    return true;
  }

  private propOccupies(prop: MapDocument["props"][number], coord: GridCoord): boolean {
    const definition = this.catalog.get(prop.catalogId);
    if (!definition || definition.layer !== "prop") return false;
    return (
      coord.x >= prop.x &&
      coord.y >= prop.y &&
      coord.x < prop.x + definition.footprint.width &&
      coord.y < prop.y + definition.footprint.height
    );
  }

  private propsOverlap(
    existing: MapDocument["props"][number],
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

  private emit(): void {
    const state = this.state;
    this.#listeners.forEach((listener) => listener(state));
  }
}
