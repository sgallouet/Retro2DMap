import type Phaser from "phaser";
import {
  ALL_CARDINAL,
  ALL_NEIGHBORS,
  EAST,
  WEST,
  classifyNetwork,
  terrainTopologyKey,
} from "../domain/autotile";
import type { CatalogEntry, IWorldCatalog } from "../domain/catalog";
import type { IPrefabCatalog, PrefabDefinition } from "../domain/prefab";
import type { AssetRenderContext, IAssetProvider } from "../phaser/IAssetProvider";

type PaletteView = "grid" | "list";

const allEntries = (catalog: IWorldCatalog): readonly CatalogEntry[] => [
  ...catalog.terrains,
  ...catalog.props,
  ...catalog.actors,
];

/**
 * Upgrades the semantic palette rendered by EditorShell into a visual asset
 * browser without coupling the editor controller to Phaser/DOM presentation.
 *
 * Preview images are captured from the exact runtime textures chosen by the
 * active IAssetProvider, so authored sprites and procedural fallbacks always
 * match what the map renderer paints.
 */
export class PalettePreviewEnhancer {
  readonly #previewUrls = new Map<string, string>();
  readonly #observer: MutationObserver;
  #query = "";
  #view: PaletteView = "grid";

  constructor(
    private readonly root: HTMLElement,
    private readonly scene: Phaser.Scene,
    private readonly assets: IAssetProvider,
    private readonly catalog: IWorldCatalog,
    private readonly prefabs: IPrefabCatalog,
  ) {
    this.#observer = new MutationObserver(() => this.enhancePalette());
  }

  mount(): void {
    const panel = this.root.querySelector<HTMLElement>(".palette-panel");
    const palette = this.root.querySelector<HTMLElement>('[data-role="palette"]');
    const tabs = this.root.querySelector<HTMLElement>('[data-role="layers"]');
    if (!panel || !palette || !tabs) return;

    panel.dataset.paletteView = this.#view;

    if (!panel.querySelector('[data-role="palette-tools"]')) {
      const tools = document.createElement("div");
      tools.className = "palette-tools";
      tools.dataset.role = "palette-tools";
      tools.innerHTML = `
        <label class="palette-search">
          <span aria-hidden="true">⌕</span>
          <input
            data-role="palette-search"
            type="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="Search world assets"
            aria-label="Search world assets"
          />
        </label>
        <span class="palette-count" data-role="palette-count">0 assets</span>
        <div class="palette-view-toggle" aria-label="Asset browser view">
          <button type="button" data-palette-view="grid" class="active" title="Thumbnail grid" aria-label="Thumbnail grid">▦</button>
          <button type="button" data-palette-view="list" title="Compact list" aria-label="Compact list">☷</button>
        </div>
      `;
      tabs.insertAdjacentElement("afterend", tools);

      const search = tools.querySelector<HTMLInputElement>('[data-role="palette-search"]');
      search?.addEventListener("input", () => {
        this.#query = search.value.trim().toLocaleLowerCase();
        this.applyFilter();
      });

      tools.querySelectorAll<HTMLButtonElement>("[data-palette-view]").forEach((button) => {
        button.addEventListener("click", () => {
          const view = button.dataset.paletteView;
          if (view !== "grid" && view !== "list") return;
          this.#view = view;
          panel.dataset.paletteView = view;
          tools.querySelectorAll<HTMLButtonElement>("[data-palette-view]").forEach((candidate) => {
            candidate.classList.toggle("active", candidate.dataset.paletteView === view);
          });
        });
      });
    }

    this.#observer.observe(palette, { childList: true, subtree: true });
    this.enhancePalette();

    const refresh = (): void => {
      this.captureRuntimePreviews();
      this.enhancePalette(true);
    };

    if (this.scene.sys.isActive()) {
      queueMicrotask(refresh);
    } else {
      this.scene.events.once("create", refresh);
    }
  }

  private captureRuntimePreviews(): void {
    this.#previewUrls.clear();

    for (const entry of allEntries(this.catalog)) {
      const url = this.captureEntry(entry);
      if (url) this.#previewUrls.set(entry.id, url);
    }
  }

  private captureEntry(entry: CatalogEntry): string | undefined {
    const context = this.previewContext(entry);
    const ref = this.assets.textureRef(entry, 0, 0, context);
    if (!this.scene.textures.exists(ref.key)) return undefined;

    const texture = this.scene.textures.get(ref.key);
    const frame = ref.frame === undefined ? texture.get() : texture.get(ref.frame);
    if (!frame) return undefined;

    const source = frame.source.image as unknown as CanvasImageSource;
    const width = Math.max(1, Math.round(frame.cutWidth));
    const height = Math.max(1, Math.round(frame.cutHeight));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    try {
      ctx.drawImage(
        source,
        frame.cutX,
        frame.cutY,
        frame.cutWidth,
        frame.cutHeight,
        0,
        0,
        width,
        height,
      );
      return canvas.toDataURL("image/png");
    } catch {
      return undefined;
    }
  }

  private previewContext(entry: CatalogEntry): AssetRenderContext | undefined {
    if (entry.layer === "terrain") {
      return {
        terrain: {
          neighborMask: ALL_NEIGHBORS,
          cardinalMask: ALL_CARDINAL,
          openMask: 0,
          innerCornerMask: 0,
          topologyKey: terrainTopologyKey(ALL_NEIGHBORS),
          variation: 0,
        },
      };
    }

    if (entry.layer === "prop" && entry.network) {
      return { network: classifyNetwork(EAST | WEST) };
    }

    if (entry.layer === "actor") {
      return { actor: { facing: "south" } };
    }

    return undefined;
  }

  private enhancePalette(force = false): void {
    const palette = this.root.querySelector<HTMLElement>('[data-role="palette"]');
    if (!palette) return;

    palette.querySelectorAll<HTMLButtonElement>("[data-catalog-id]").forEach((button) => {
      if (force) button.dataset.visualEnhanced = "";
      if (button.dataset.visualEnhanced === "1") return;

      const id = button.dataset.catalogId;
      const entry = id ? this.catalog.get(id) : undefined;
      if (!entry) return;

      button.dataset.visualEnhanced = "1";
      button.dataset.paletteSearch = `${entry.label} ${entry.id} ${entry.category} ${entry.tags.join(" ")}`.toLocaleLowerCase();
      button.classList.add("palette-item--visual", `palette-item--${entry.layer}`);
      button.title = `${entry.label}\n${entry.id}`;
      button.replaceChildren(
        this.entryPreview(entry),
        this.itemCopy(entry.label, this.entryMeta(entry)),
      );
    });

    palette.querySelectorAll<HTMLButtonElement>("[data-prefab-id]").forEach((button) => {
      if (force) button.dataset.visualEnhanced = "";
      if (button.dataset.visualEnhanced === "1") return;

      const id = button.dataset.prefabId;
      const prefab = id ? this.prefabs.get(id) : undefined;
      if (!prefab) return;

      button.dataset.visualEnhanced = "1";
      button.dataset.paletteSearch = `${prefab.label} ${prefab.id} ${prefab.category} ${prefab.tags.join(" ")}`.toLocaleLowerCase();
      button.classList.add("palette-item--visual", "palette-item--prefab");
      button.title = `${prefab.label}\n${prefab.id}`;
      button.replaceChildren(
        this.prefabPreview(prefab),
        this.itemCopy(
          prefab.label,
          `${prefab.width}×${prefab.height} · ${prefab.props.length + prefab.actors.length} entities`,
        ),
      );
    });

    this.applyFilter();
  }

  private entryPreview(entry: CatalogEntry): HTMLElement {
    const preview = document.createElement("span");
    preview.className = `palette-preview palette-preview--${entry.layer}`;

    const url = this.#previewUrls.get(entry.id);
    if (url) {
      if (entry.layer === "terrain") {
        preview.style.backgroundImage = `url("${url}")`;
      } else {
        const image = document.createElement("img");
        image.src = url;
        image.alt = "";
        image.draggable = false;
        preview.append(image);
      }
    } else {
      const fallback = document.createElement("span");
      fallback.className = "palette-preview-fallback";
      fallback.textContent =
        entry.layer === "terrain" ? "◇" : entry.layer === "actor" ? "♟" : "◆";
      preview.append(fallback);
    }

    const badge = document.createElement("span");
    badge.className = "palette-preview-badge";
    badge.textContent = this.entryBadge(entry);
    preview.append(badge);
    return preview;
  }

  private prefabPreview(prefab: PrefabDefinition): HTMLElement {
    const preview = document.createElement("span");
    preview.className = "palette-preview palette-preview--prefab";

    const baseTerrain = prefab.terrain[0]?.terrainId;
    const baseUrl = baseTerrain ? this.#previewUrls.get(baseTerrain) : undefined;
    if (baseUrl) preview.style.backgroundImage = `url("${baseUrl}")`;

    for (const placement of prefab.props.slice(0, 10)) {
      const definition = this.catalog.get(placement.catalogId);
      const url = this.#previewUrls.get(placement.catalogId);
      if (!definition || definition.layer !== "prop" || !url) continue;
      preview.append(
        this.prefabEntity(
          url,
          placement.x,
          placement.y,
          definition.footprint.width,
          definition.footprint.height,
          prefab,
        ),
      );
    }

    for (const placement of prefab.actors.slice(0, 6)) {
      const url = this.#previewUrls.get(placement.catalogId);
      if (!url) continue;
      preview.append(this.prefabEntity(url, placement.x, placement.y, 1, 1, prefab));
    }

    const badge = document.createElement("span");
    badge.className = "palette-preview-badge";
    badge.textContent = `${prefab.width}×${prefab.height}`;
    preview.append(badge);
    return preview;
  }

  private prefabEntity(
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    prefab: PrefabDefinition,
  ): HTMLImageElement {
    const image = document.createElement("img");
    image.className = "prefab-preview-entity";
    image.src = url;
    image.alt = "";
    image.draggable = false;
    image.style.left = `${(x / prefab.width) * 100}%`;
    image.style.top = `${(y / prefab.height) * 100}%`;
    image.style.width = `${Math.max((width / prefab.width) * 100, 11)}%`;
    image.style.height = `${Math.max((height / prefab.height) * 100, 16)}%`;
    return image;
  }

  private itemCopy(label: string, meta: string): HTMLElement {
    const copy = document.createElement("span");
    copy.className = "palette-item-copy";

    const name = document.createElement("strong");
    name.textContent = label;
    const detail = document.createElement("small");
    detail.textContent = meta;

    copy.append(name, detail);
    return copy;
  }

  private entryBadge(entry: CatalogEntry): string {
    if (entry.layer === "terrain") return entry.walkable ? "TILE" : "BLOCK";
    if (entry.layer === "actor") return "ACTOR";
    if (entry.network) return "AUTO";
    const { width, height } = entry.footprint;
    return width === 1 && height === 1 ? "PROP" : `${width}×${height}`;
  }

  private entryMeta(entry: CatalogEntry): string {
    if (entry.layer === "terrain") {
      return entry.walkable ? `Walkable · cost ${entry.movementCost}` : "Not walkable";
    }

    if (entry.layer === "actor") {
      return entry.faction === "kingdom" ? "Kingdom actor" : "Neutral actor";
    }

    const footprint = `${entry.footprint.width}×${entry.footprint.height}`;
    if (entry.network) return `${footprint} · auto-connect`;
    return `${footprint} · ${entry.blocksMovement ? "solid" : "passable"}`;
  }

  private applyFilter(): void {
    const palette = this.root.querySelector<HTMLElement>('[data-role="palette"]');
    if (!palette) return;

    let visible = 0;
    const items = [...palette.querySelectorAll<HTMLButtonElement>(".palette-item--visual")];
    for (const item of items) {
      const haystack = item.dataset.paletteSearch ?? "";
      const matches = this.#query.length === 0 || haystack.includes(this.#query);
      item.hidden = !matches;
      if (matches) visible += 1;
    }

    palette.querySelectorAll<HTMLElement>(".palette-group").forEach((group) => {
      const hasVisible = [...group.querySelectorAll<HTMLButtonElement>(".palette-item--visual")].some(
        (item) => !item.hidden,
      );
      group.hidden = !hasVisible;
    });

    const count = this.root.querySelector<HTMLElement>('[data-role="palette-count"]');
    if (count) {
      count.textContent =
        this.#query.length === 0
          ? `${visible} asset${visible === 1 ? "" : "s"}`
          : `${visible} / ${items.length}`;
    }
  }
}
