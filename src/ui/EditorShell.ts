import type { CatalogEntry, IWorldCatalog } from "../domain/catalog";
import { validateMapDocument, type BrushSize, type LayerKind, type MapDocument } from "../domain/map";
import type { IPrefabCatalog, PrefabDefinition } from "../domain/prefab";
import type { IEditorController } from "../editor/EditorController";
import type { IMapStore } from "../storage/LocalStorageMapStore";

type PaletteMode = LayerKind | "prefab";

export class EditorShell {
  #activeLayer: PaletteMode = "terrain";
  #toastTimer?: number;

  constructor(
    private readonly root: HTMLElement,
    private readonly editor: IEditorController,
    private readonly catalog: IWorldCatalog,
    private readonly prefabs: IPrefabCatalog,
    private readonly store: IMapStore,
    private readonly createResetMap: () => MapDocument,
  ) {}

  mount(): void {
    this.root.innerHTML = `
      <div class="editor-shell">
        <header class="topbar">
          <div class="brand">
            <span class="brand-mark">◆</span>
            <div>
              <strong>Retro2DMap</strong>
              <small>world builder</small>
            </div>
          </div>
          <div class="topbar-actions">
            <button data-action="paint" class="tool-button">Paint <kbd>P</kbd></button>
            <button data-action="erase" class="tool-button">Erase <kbd>E</kbd></button>
            <span class="toolbar-separator"></span>
            <span class="brush-label">Stroke</span>
            <button data-stroke-mode="brush" title="Free paint stroke">Free <kbd>B</kbd></button>
            <button data-stroke-mode="line" title="Straight semantic line">Line <kbd>L</kbd></button>
            <button data-stroke-mode="rect" title="Filled semantic terrain rectangle">Rect <kbd>R</kbd></button>
            <span class="toolbar-separator"></span>
            <span class="brush-label">Size</span>
            <button data-brush-size="1" title="1×1 terrain brush">1</button>
            <button data-brush-size="3" title="3×3 terrain brush">3</button>
            <button data-brush-size="5" title="5×5 terrain brush">5</button>
            <span class="toolbar-separator"></span>
            <button data-action="undo" title="Undo">↶</button>
            <button data-action="redo" title="Redo">↷</button>
            <button data-action="grid" title="Toggle grid">Grid</button>
            <button data-action="navigation" title="Toggle walkability overlay">Walk <kbd>N</kbd></button>
            <span class="toolbar-separator"></span>
            <button data-action="save">Save local</button>
            <button data-action="load">Load local</button>
            <button data-action="export">Export JSON</button>
            <button data-action="import">Import</button>
            <button data-action="reset" class="danger-soft">Reset sample</button>
            <input data-role="import-input" type="file" accept=".json,application/json" hidden />
          </div>
        </header>

        <aside class="palette-panel">
          <div class="panel-title">
            <span>Palette</span>
            <small>1 tile = 1 character</small>
          </div>
          <div class="layer-tabs" data-role="layers"></div>
          <div class="palette-scroll" data-role="palette"></div>
        </aside>

        <main class="viewport-panel">
          <div id="game-canvas" class="game-canvas"></div>
          <div class="viewport-help">
            LMB paint · RMB erase · B free · L line · R rect · wheel zoom · middle/Space drag pan
          </div>
        </main>

        <aside class="inspector-panel">
          <div class="panel-title">
            <span>Inspector</span>
            <small>selection + map</small>
          </div>
          <div data-role="inspector" class="inspector-content"></div>
          <div class="architecture-note">
            <strong>Asset boundary</strong>
            <p>Everything visible is generated in code today. Map IDs stay stable when PNG/WebP/atlas assets replace the procedural provider later.</p>
          </div>
        </aside>

        <footer class="statusbar">
          <span data-role="status-map"></span>
          <span class="status-spacer"></span>
          <span>48px logical cells</span>
          <span>Phaser 3 · TypeScript</span>
        </footer>

        <div class="toast" data-role="toast" aria-live="polite"></div>
      </div>
    `;

    this.renderLayerTabs();
    this.bindActions();
    this.editor.subscribe((state) => {
      this.#activeLayer = state.selectedPrefabId ? "prefab" : state.selection.layer;
      this.renderLayerTabs();
      this.renderPalette(state.selectedPrefabId ?? state.selection.catalogId);
      this.renderInspector();
      this.syncToolbar();
      const status = this.root.querySelector<HTMLElement>('[data-role="status-map"]');
      if (status) {
        status.textContent = `${state.document.name} · ${state.document.width}×${state.document.height} · ${state.document.props.length} props · ${state.document.actors.length} actors`;
      }
    });
  }

  private renderLayerTabs(): void {
    const container = this.root.querySelector<HTMLElement>('[data-role="layers"]');
    if (!container) return;

    const labels: ReadonlyArray<[PaletteMode, string]> = [
      ["terrain", "Terrain"],
      ["prop", "Props"],
      ["actor", "Actors"],
      ["prefab", "Prefabs"],
    ];

    container.innerHTML = labels
      .map(
        ([mode, label]) =>
          `<button data-palette-mode="${mode}" class="${mode === this.#activeLayer ? "active" : ""}">${label}</button>`,
      )
      .join("");

    container.querySelectorAll<HTMLButtonElement>("[data-palette-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.paletteMode as PaletteMode;

        if (mode === "prefab") {
          const first = this.prefabs.all[0];
          if (first) this.editor.selectPrefab(first.id);
          return;
        }

        const current = this.editor.state.selection;
        const entries = this.catalog.forLayer(mode);
        const preferred = current.layer === mode ? this.catalog.get(current.catalogId) : undefined;
        const next = preferred?.layer === mode ? preferred : entries[0];
        if (next) this.editor.select(mode, next.id);
      });
    });
  }

  private renderPalette(selectedId: string): void {
    const container = this.root.querySelector<HTMLElement>('[data-role="palette"]');
    if (!container) return;

    if (this.#activeLayer === "prefab") {
      const groups = new Map<string, PrefabDefinition[]>();
      this.prefabs.all.forEach((prefab) => {
        const group = groups.get(prefab.category) ?? [];
        group.push(prefab);
        groups.set(prefab.category, group);
      });

      container.innerHTML = Array.from(groups.entries())
        .map(
          ([category, items]) => `
            <section class="palette-group">
              <h3>${category}</h3>
              <div class="palette-grid">
                ${items.map((item) => this.prefabButton(item, selectedId === item.id)).join("")}
              </div>
            </section>
          `,
        )
        .join("");

      container.querySelectorAll<HTMLButtonElement>("[data-prefab-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.prefabId;
          if (id) this.editor.selectPrefab(id);
        });
      });
      return;
    }

    const entries = this.catalog.forLayer(this.#activeLayer);
    const groups = new Map<string, CatalogEntry[]>();
    entries.forEach((entry) => {
      const group = groups.get(entry.category) ?? [];
      group.push(entry);
      groups.set(entry.category, group);
    });

    container.innerHTML = Array.from(groups.entries())
      .map(([category, items]) => `
        <section class="palette-group">
          <h3>${category}</h3>
          <div class="palette-grid">
            ${items.map((item) => this.paletteButton(item, selectedId === item.id)).join("")}
          </div>
        </section>
      `)
      .join("");

    container.querySelectorAll<HTMLButtonElement>("[data-catalog-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.catalogId;
        if (id) this.editor.select(this.#activeLayer as LayerKind, id);
      });
    });
  }

  private prefabButton(prefab: PrefabDefinition, selected: boolean): string {
    return `
      <button class="palette-item ${selected ? "selected" : ""}" data-prefab-id="${prefab.id}">
        <span class="palette-swatch palette-swatch--prefab">${prefab.width}×${prefab.height}</span>
        <span>${prefab.label}</span>
      </button>
    `;
  }

  private paletteButton(entry: CatalogEntry, selected: boolean): string {
    const badge =
      entry.layer === "terrain"
        ? "◇"
        : entry.layer === "actor"
          ? "♟"
          : entry.footprint.width > 1 || entry.footprint.height > 1
            ? `${entry.footprint.width}×${entry.footprint.height}`
            : "◆";
    return `
      <button class="palette-item ${selected ? "selected" : ""}" data-catalog-id="${entry.id}">
        <span class="palette-swatch palette-swatch--${entry.layer}">${badge}</span>
        <span>${entry.label}</span>
      </button>
    `;
  }

  private renderInspector(): void {
    const container = this.root.querySelector<HTMLElement>('[data-role="inspector"]');
    if (!container) return;
    const state = this.editor.state;
    const entry = this.catalog.get(state.selection.catalogId);

    let details = "";
    if (entry?.layer === "terrain") {
      details = `
        <dt>Walkable</dt><dd>${entry.walkable ? "Yes" : "No"}</dd>
        <dt>Move cost</dt><dd>${entry.movementCost}</dd>
      `;
    } else if (entry?.layer === "prop") {
      details = `
        <dt>Footprint</dt><dd>${entry.footprint.width}×${entry.footprint.height}</dd>
        <dt>Blocks</dt><dd>${entry.blocksMovement ? "Yes" : "No"}</dd>
      `;
    } else if (entry?.layer === "actor") {
      details = `<dt>Faction</dt><dd>${entry.faction}</dd><dt>Footprint</dt><dd>1×1</dd>`;
    }

    container.innerHTML = `
      <div class="selection-card">
        <span class="eyebrow">${state.selection.layer}</span>
        <h2>${entry?.label ?? "Nothing selected"}</h2>
        <code>${entry?.id ?? "—"}</code>
      </div>
      <dl class="property-grid">
        <dt>Tool</dt><dd>${state.selection.tool}</dd>
        <dt>Stroke</dt><dd>${state.selection.strokeMode}</dd>
        <dt>Brush</dt><dd>${state.selection.layer === "terrain" ? `${state.selection.brushSize}×${state.selection.brushSize}` : "n/a"}</dd>
        <dt>Category</dt><dd>${entry?.category ?? "—"}</dd>
        ${details}
      </dl>
      <hr />
      <dl class="property-grid">
        <dt>Map</dt><dd>${state.document.name}</dd>
        <dt>Size</dt><dd>${state.document.width}×${state.document.height}</dd>
        <dt>Terrain cells</dt><dd>${state.document.tiles.length}</dd>
        <dt>Props</dt><dd>${state.document.props.length}</dd>
        <dt>Actors</dt><dd>${state.document.actors.length}</dd>
      </dl>
      <div class="tip-card">
        <strong>Builder rule</strong>
        <span>Actors always own one cell. Large props are anchored to a cell and declare a footprint, so pathfinding and future sprite replacement stay deterministic.</span>
      </div>
    `;
  }

  private syncToolbar(): void {
    const state = this.editor.state;
    this.setPressed("paint", state.selection.tool === "paint");
    this.setPressed("erase", state.selection.tool === "erase");
    this.setPressed("grid", state.gridVisible);
    this.setPressed("navigation", state.navigationVisible);

    const selected = this.catalog.get(state.selection.catalogId);
    const supportsLine =
      state.selection.layer === "terrain" ||
      (selected?.layer === "prop" && selected.network !== undefined);
    const supportsRect = state.selection.layer === "terrain";

    this.root.querySelectorAll<HTMLButtonElement>("[data-stroke-mode]").forEach((button) => {
      const mode = button.dataset.strokeMode;
      button.classList.toggle("active", mode === state.selection.strokeMode);
      button.disabled =
        (mode === "line" && !supportsLine) ||
        (mode === "rect" && !supportsRect);
    });

    this.root.querySelectorAll<HTMLButtonElement>("[data-brush-size]").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.brushSize) === state.selection.brushSize);
      button.disabled = state.selection.layer !== "terrain";
    });

    const undo = this.root.querySelector<HTMLButtonElement>('[data-action="undo"]');
    const redo = this.root.querySelector<HTMLButtonElement>('[data-action="redo"]');
    if (undo) undo.disabled = !state.canUndo;
    if (redo) redo.disabled = !state.canRedo;
  }

  private setPressed(action: string, pressed: boolean): void {
    this.root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.classList.toggle("active", pressed);
  }

  private bindActions(): void {
    this.root.querySelector('[data-action="paint"]')?.addEventListener("click", () => this.editor.setTool("paint"));
    this.root.querySelector('[data-action="erase"]')?.addEventListener("click", () => this.editor.setTool("erase"));
    this.root.querySelectorAll<HTMLButtonElement>("[data-stroke-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.strokeMode;
        if (mode === "brush" || mode === "line" || mode === "rect") {
          this.editor.setStrokeMode(mode);
        }
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-brush-size]").forEach((button) => {
      button.addEventListener("click", () => {
        const size = Number(button.dataset.brushSize) as BrushSize;
        if (size === 1 || size === 3 || size === 5) this.editor.setBrushSize(size);
      });
    });
    this.root.querySelector('[data-action="undo"]')?.addEventListener("click", () => this.editor.undo());
    this.root.querySelector('[data-action="redo"]')?.addEventListener("click", () => this.editor.redo());
    this.root.querySelector('[data-action="grid"]')?.addEventListener("click", () => {
      this.editor.setGridVisible(!this.editor.state.gridVisible);
    });
    this.root.querySelector('[data-action="navigation"]')?.addEventListener("click", () => {
      this.editor.setNavigationVisible(!this.editor.state.navigationVisible);
    });

    this.root.querySelector('[data-action="save"]')?.addEventListener("click", async () => {
      await this.store.save(this.editor.state.document);
      this.toast("Saved to this browser.");
    });

    this.root.querySelector('[data-action="load"]')?.addEventListener("click", async () => {
      const document = await this.store.load(this.editor.state.document.id);
      if (!document) {
        this.toast("No local save for this map yet.");
        return;
      }
      this.editor.replaceDocument(document);
      this.toast("Local save loaded.");
    });

    this.root.querySelector('[data-action="export"]')?.addEventListener("click", () => this.exportMap());
    this.root.querySelector('[data-action="import"]')?.addEventListener("click", () => {
      this.root.querySelector<HTMLInputElement>('[data-role="import-input"]')?.click();
    });

    this.root.querySelector<HTMLInputElement>('[data-role="import-input"]')?.addEventListener("change", async (event) => {
      const input = event.currentTarget as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as unknown;
        this.editor.replaceDocument(validateMapDocument(parsed));
        this.toast("Map imported.");
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "Could not import map.");
      } finally {
        input.value = "";
      }
    });

    this.root.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
      this.editor.replaceDocument(this.createResetMap());
      this.toast("Sample kingdom restored.");
    });

    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key.toLowerCase() === "p") this.editor.setTool("paint");
      if (event.key.toLowerCase() === "e") this.editor.setTool("erase");
      if (event.key.toLowerCase() === "b") this.editor.setStrokeMode("brush");
      if (event.key.toLowerCase() === "l") this.editor.setStrokeMode("line");
      if (event.key.toLowerCase() === "r") this.editor.setStrokeMode("rect");
      if (event.key === "1") this.editor.setBrushSize(1);
      if (event.key === "3") this.editor.setBrushSize(3);
      if (event.key === "5") this.editor.setBrushSize(5);
    });
  }

  private exportMap(): void {
    const document = this.editor.state.document;
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${document.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.toast("Map exported.");
  }

  private toast(message: string): void {
    const element = this.root.querySelector<HTMLElement>('[data-role="toast"]');
    if (!element) return;
    element.textContent = message;
    element.classList.add("visible");
    if (this.#toastTimer) window.clearTimeout(this.#toastTimer);
    this.#toastTimer = window.setTimeout(() => element.classList.remove("visible"), 2200);
  }
}
