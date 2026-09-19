import Phaser from "phaser";
import type { CatalogEntry, IWorldCatalog } from "../domain/catalog";
import type { SpriteAssetManifest, FrameChoice, SpriteSpec } from "../assets/SpriteAssetManifest";
import type {
  AssetRenderContext,
  IAssetProvider,
  TextureRef,
} from "./IAssetProvider";

const deterministicIndex = (x: number, y: number, salt: number): number => {
  let value = Math.imul(x + 101, 73_856_093) ^ Math.imul(y + 211, 19_349_663) ^ salt;
  value ^= value >>> 16;
  return value >>> 0;
};

/**
 * Atlas-backed asset provider with per-entry procedural fallback.
 *
 * This class is intentionally usable before the final art exists: a manifest
 * can cover one catalog entry at a time while all un-authored entries continue
 * to resolve through the fallback provider.
 */
export class SpriteAssetProvider implements IAssetProvider {
  #scene?: Phaser.Scene;

  constructor(
    private readonly manifest: SpriteAssetManifest,
    private readonly fallback: IAssetProvider,
  ) {}

  preload(scene: Phaser.Scene, catalog: IWorldCatalog): void {
    this.#scene = scene;
    this.fallback.preload(scene, catalog);

    for (const atlas of this.manifest.atlases) {
      if (!scene.textures.exists(atlas.key)) {
        scene.load.atlas(atlas.key, atlas.imageUrl, atlas.atlasUrl);
      }
    }
  }

  prepare(scene: Phaser.Scene, catalog: IWorldCatalog): void {
    this.#scene = scene;
    this.fallback.prepare(scene, catalog);
  }

  textureRef(
    entry: CatalogEntry,
    x: number,
    y: number,
    context?: AssetRenderContext,
  ): TextureRef {
    const spec = this.manifest.entries[entry.id];
    if (!spec || !this.atlasReady(spec)) {
      return this.fallback.textureRef(entry, x, y, context);
    }

    const frame = this.resolveFrame(spec, x, y, context);
    if (!frame) {
      return this.fallback.textureRef(entry, x, y, context);
    }

    return { key: spec.atlas, frame };
  }

  private resolveFrame(
    spec: SpriteSpec,
    x: number,
    y: number,
    context?: AssetRenderContext,
  ): string | undefined {
    if (spec.kind === "static") {
      return this.pick(spec.frame, x, y, 0);
    }

    if (spec.kind === "terrain") {
      const topologyKey = context?.terrain?.topologyKey;
      if (!topologyKey) return undefined;
      const frames = spec.topologies[topologyKey];
      if (!frames) return undefined;
      return this.pick(frames, x, y, context?.terrain?.variation ?? 0);
    }

    const topologyKey = context?.network?.topologyKey;
    if (!topologyKey) return undefined;
    const frames = spec.topologies[topologyKey];
    if (!frames) return undefined;
    return this.pick(frames, x, y, context?.network?.neighborMask ?? 0);
  }

  private pick(
    choice: FrameChoice,
    x: number,
    y: number,
    salt: number,
  ): string | undefined {
    if (typeof choice === "string") return choice;
    if (choice.length === 0) return undefined;
    return choice[deterministicIndex(x, y, salt) % choice.length];
  }

  private atlasReady(spec: SpriteSpec): boolean {
    return this.#scene?.textures.exists(spec.atlas) ?? false;
  }
}
