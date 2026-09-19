import { History } from "../core/History";
import type { IWorldCatalog } from "../domain/catalog";
import type { IPrefabCatalog } from "../domain/prefab";
import { NavigationGridBuilder } from "../domain/navigation";
import { GridPathfinder } from "../domain/pathfinding";
import { MapValidator, type ValidationIssue } from "../domain/validation";
import {
  cloneMap,
  type BrushSize,
  type EditorEntitySelection,
  type EditorSelection,
  type GridCoord,
  type LayerKind,
  type MapDocument,
  type StrokeMode,
} from "../domain/map";
import { EntityPlacementService } from "./PlacementService";
import { PrefabPlacer } from "./PrefabPlacer";
import { LogicalWorldPainter } from "./WorldPainter";

export interface EditorRoutePreview {
  start: GridCoord;
  goal: GridCoord | null;
  path: readonly GridCoord[];
  found: boolean | null;
  cost: number | null;
}

export interface EditorState {
  document: MapDocument;
  selection: EditorSelection;
  gridVisible: boolean;
  navigationVisible: boolean;
  selectedPrefabId: string | null;
  entitySelection: EditorEntitySelection | null;
  validationIssues: readonly ValidationIssue[];
  routePreview: EditorRoutePreview | null;
  canUndo: boolean;
  canRedo: boolean;
}

export type EditorListener = (state: Readonly<EditorState>) => void;

export interface IEditorController {
  readonly state: Readonly<EditorState>;
  subscribe(listener: EditorListener): () => void;
  select(layer: LayerKind, catalogId: string): void;
  selectPrefab(prefabId: string | null): void;
  selectEntityAt(coord: GridCoord): void;
  clearEntitySelection(): void;
  moveSelectedEntity(coord: GridCoord): void;
  rotateSelectedEntity(clockwise?: boolean): void;
  validateMap(): readonly ValidationIssue[];
  clearValidation(): void;
  routeClick(coord: GridCoord): void;
  clearRoute(): void;
  setTool(tool: EditorSelection["tool"]): void;
  setStrokeMode(mode: StrokeMode): void;
  setBrushSize(size: BrushSize): void;
  setGridVisible(visible: boolean): void;
  setNavigationVisible(visible: boolean): void;
  beginStroke(): void;
  applyAt(coord: GridCoord, eraseOverride?: boolean): void;
  applyLine(from: GridCoord, to: GridCoord, eraseOverride?: boolean): void;
  applyRect(from: GridCoord, to: GridCoord, eraseOverride?: boolean): void;
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
  #navigationVisible = false;
  #selectedPrefabId: string | null = null;
  #entitySelection: EditorEntitySelection | null = null;
  #validationIssues: readonly ValidationIssue[] = [];
  #routePreview: EditorRoutePreview | null = null;
  #strokeActive = false;
  readonly #listeners = new Set<EditorListener>();
  readonly #history = new History<MapDocument>(cloneMap);
  readonly #worldPainter = new LogicalWorldPainter();
  readonly #placement: EntityPlacementService;
  readonly #prefabPlacer?: PrefabPlacer;
  readonly #validator: MapValidator;
  readonly #navigation: NavigationGridBuilder;
  readonly #pathfinder = new GridPathfinder();

  constructor(
    document: MapDocument,
    private readonly catalog: IWorldCatalog,
    private readonly prefabs?: IPrefabCatalog,
  ) {
    this.#document = cloneMap(document);
    this.#placement = new EntityPlacementService(catalog);
    this.#validator = new MapValidator(catalog);
    this.#navigation = new NavigationGridBuilder(catalog);
    if (prefabs) this.#prefabPlacer = new PrefabPlacer(catalog);
  }

  get state(): Readonly<EditorState> {
    return {
      document: this.#document,
      selection: this.#selection,
      gridVisible: this.#gridVisible,
      navigationVisible: this.#navigationVisible,
      selectedPrefabId: this.#selectedPrefabId,
      entitySelection: this.#entitySelection,
      validationIssues: this.#validationIssues,
      routePreview: this.#routePreview,
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
    const currentMode = this.#selection.strokeMode;
    const supportsCurrentMode =
      currentMode === "brush" ||
      (currentMode === "rect" && layer === "terrain") ||
      (currentMode === "line" &&
        (layer === "terrain" || (item.layer === "prop" && item.network !== undefined)));

    this.#selection = {
      ...this.#selection,
      layer,
      catalogId,
      tool:
        this.#selection.tool === "select" || this.#selection.tool === "route"
          ? "paint"
          : this.#selection.tool,
      strokeMode: supportsCurrentMode ? currentMode : "brush",
    };
    this.#selectedPrefabId = null;
    this.#entitySelection = null;
    this.emit();
  }

  selectPrefab(prefabId: string | null): void {
    if (prefabId !== null && !this.prefabs?.get(prefabId)) {
      throw new Error(`Unknown prefab ${prefabId}.`);
    }

    this.#selectedPrefabId = prefabId;
    this.#entitySelection = null;
    if (prefabId !== null) {
      this.#selection = {
        ...this.#selection,
        tool: "paint",
        strokeMode: "brush",
      };
    }
    this.emit();
  }

  selectEntityAt(coord: GridCoord): void {
    const actor = [...this.#document.actors]
      .reverse()
      .find((candidate) => candidate.x === coord.x && candidate.y === coord.y);

    if (actor) {
      this.#entitySelection = { kind: "actor", id: actor.id };
      this.#selectedPrefabId = null;
      this.#selection = { ...this.#selection, tool: "select", strokeMode: "brush" };
      this.emit();
      return;
    }

    const prop = [...this.#document.props]
      .reverse()
      .find((candidate) => this.#placement.propOccupies(candidate, coord));

    this.#entitySelection = prop ? { kind: "prop", id: prop.id } : null;
    this.#selectedPrefabId = null;
    this.#selection = { ...this.#selection, tool: "select", strokeMode: "brush" };
    this.emit();
  }

  clearEntitySelection(): void {
    if (!this.#entitySelection) return;
    this.#entitySelection = null;
    this.emit();
  }

  moveSelectedEntity(coord: GridCoord): void {
    const selected = this.#entitySelection;
    if (!selected) return;

    const changed =
      selected.kind === "prop"
        ? this.#placement.moveProp(this.#document, selected.id, coord, "reject")
        : this.#placement.moveActor(this.#document, selected.id, coord);

    if (changed) {
      this.invalidateDiagnostics();
      this.emit();
    }
  }

  rotateSelectedEntity(clockwise = true): void {
    const selected = this.#entitySelection;
    if (!selected || selected.kind !== "actor") return;

    const actor = this.#document.actors.find((candidate) => candidate.id === selected.id);
    if (!actor) return;

    const facings = ["north", "east", "south", "west"] as const;
    const current = facings.indexOf(actor.facing);
    const delta = clockwise ? 1 : -1;
    actor.facing = facings[(current + delta + facings.length) % facings.length] ?? "south";
    this.invalidateDiagnostics();
    this.emit();
  }

  validateMap(): readonly ValidationIssue[] {
    this.#validationIssues = this.#validator.validate(this.#document);
    this.emit();
    return this.#validationIssues;
  }

  clearValidation(): void {
    if (this.#validationIssues.length === 0) return;
    this.#validationIssues = [];
    this.emit();
  }

  routeClick(coord: GridCoord): void {
    const navigation = this.#navigation.build(this.#document);
    const cell = navigation.at(coord);

    if (!this.#routePreview || this.#routePreview.goal !== null) {
      this.#routePreview = {
        start: { ...coord },
        goal: null,
        path: cell?.walkable ? [{ ...coord }] : [],
        found: cell?.walkable ? true : false,
        cost: cell?.walkable ? 0 : null,
      };
      this.emit();
      return;
    }

    const start = this.#routePreview.start;
    const result = this.#pathfinder.findPath(navigation, start, coord);
    this.#routePreview = {
      start,
      goal: { ...coord },
      path: result.path,
      found: result.found,
      cost: result.found ? result.cost : null,
    };
    this.emit();
  }

  clearRoute(): void {
    if (!this.#routePreview) return;
    this.#routePreview = null;
    this.emit();
  }

  setTool(tool: EditorSelection["tool"]): void {
    if (this.#selectedPrefabId && tool === "erase") return;

    if (tool === "route") {
      this.#selectedPrefabId = null;
      this.#entitySelection = null;
      this.#selection = { ...this.#selection, tool, strokeMode: "brush" };
      this.emit();
      return;
    }

    if (tool === "select") {
      this.#selectedPrefabId = null;
      this.#selection = { ...this.#selection, tool, strokeMode: "brush" };
      this.emit();
      return;
    }

    this.#entitySelection = null;
    this.#routePreview = null;
    this.#selection = { ...this.#selection, tool };
    this.emit();
  }

  setStrokeMode(mode: StrokeMode): void {
    if (this.#selectedPrefabId) {
      this.#selection = { ...this.#selection, strokeMode: "brush" };
      this.emit();
      return;
    }

    const selected = this.catalog.get(this.#selection.catalogId);
    const supported =
      mode === "brush" ||
      (mode === "rect" && this.#selection.layer === "terrain") ||
      (mode === "line" &&
        (this.#selection.layer === "terrain" ||
          (selected?.layer === "prop" && selected.network !== undefined)));

    this.#selection = {
      ...this.#selection,
      strokeMode: supported ? mode : "brush",
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

  setNavigationVisible(visible: boolean): void {
    this.#navigationVisible = visible;
    this.emit();
  }

  beginStroke(): void {
    if (this.#strokeActive) return;
    this.#strokeActive = true;
    this.#history.checkpoint(this.#document);
    this.emit();
  }

  applyAt(coord: GridCoord, eraseOverride = false): void {
    if (this.#selection.tool === "route") {
      this.routeClick(coord);
      return;
    }

    if (this.#selection.tool === "select") {
      this.selectEntityAt(coord);
      return;
    }

    const erase = eraseOverride || this.#selection.tool === "erase";

    if (this.#selectedPrefabId) {
      if (erase || !this.#prefabPlacer || !this.prefabs) return;
      const prefab = this.prefabs.get(this.#selectedPrefabId);
      if (!prefab) return;
      const result = this.#prefabPlacer.place(this.#document, prefab, coord);
      if (result.placed) {
        this.invalidateDiagnostics();
        this.emit();
      }
      return;
    }

    const changed = erase ? this.eraseAt(coord) : this.paintAt(coord);
    if (changed) {
      this.invalidateDiagnostics();
      this.emit();
    }
  }

  applyLine(from: GridCoord, to: GridCoord, eraseOverride = false): void {
    if (this.#selectedPrefabId) return;
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

    if (changed) {
      this.invalidateDiagnostics();
      this.emit();
    }
  }

  applyRect(from: GridCoord, to: GridCoord, eraseOverride = false): void {
    if (this.#selectedPrefabId || this.#selection.layer !== "terrain") return;

    const erase = eraseOverride || this.#selection.tool === "erase";
    const changed = this.#worldPainter.paintTerrainRect(this.#document, {
      from,
      to,
      terrainId: erase ? "grass" : this.#selection.catalogId,
    });

    if (changed) {
      this.invalidateDiagnostics();
      this.emit();
    }
  }

  endStroke(): void {
    this.#strokeActive = false;
  }

  undo(): void {
    const previous = this.#history.undo(this.#document);
    if (!previous) return;
    this.#document = previous;
    this.reconcileEntitySelection();
    this.invalidateDiagnostics();
    this.emit();
  }

  redo(): void {
    const next = this.#history.redo(this.#document);
    if (!next) return;
    this.#document = next;
    this.reconcileEntitySelection();
    this.invalidateDiagnostics();
    this.emit();
  }

  replaceDocument(document: MapDocument): void {
    this.#document = cloneMap(document);
    this.#history.clear();
    this.#strokeActive = false;
    this.#entitySelection = null;
    this.#selectedPrefabId = null;
    this.invalidateDiagnostics();
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

  private invalidateDiagnostics(): void {
    this.#validationIssues = [];
    this.#routePreview = null;
  }

  private reconcileEntitySelection(): void {
    const selected = this.#entitySelection;
    if (!selected) return;

    const exists =
      selected.kind === "prop"
        ? this.#document.props.some((prop) => prop.id === selected.id)
        : this.#document.actors.some((actor) => actor.id === selected.id);

    if (!exists) this.#entitySelection = null;
  }

  private emit(): void {
    const state = this.state;
    this.#listeners.forEach((listener) => listener(state));
  }
}
