import type Phaser from "phaser";
import type { CatalogEntry, IWorldCatalog } from "../domain/catalog";
import type { NetworkRenderContext, TerrainRenderContext } from "../domain/autotile";
import type { ActorInstance } from "../domain/map";

export interface AssetRenderContext {
  terrain?: TerrainRenderContext;
  network?: NetworkRenderContext;
  actor?: Readonly<{ facing: ActorInstance["facing"] }>;
}

/**
 * Renderer-facing texture handle. Keeping atlas frame separate from the
 * texture key lets procedural canvases and future Phaser atlases share one API.
 */
export interface TextureRef {
  key: string;
  frame?: string | number;
}

/**
 * Optional hook for authored terrain fill textures. Procedural providers that
 * implement this can composite the image under existing topology overlays.
 */
export interface ITerrainMaterialHost {
  useTerrainMaterial(catalogId: string, textureKey: string): void;
}

export const isTerrainMaterialHost = (
  provider: IAssetProvider,
): provider is IAssetProvider & ITerrainMaterialHost =>
  typeof (provider as IAssetProvider & Partial<ITerrainMaterialHost>).useTerrainMaterial ===
  "function";

export interface IAssetProvider {
  /**
   * Register external assets with Phaser's loader. Procedural providers can
   * leave this as a no-op.
   */
  preload(scene: Phaser.Scene, catalog: IWorldCatalog): void;

  /**
   * Create/prepare runtime textures after Phaser's preload stage completes.
   */
  prepare(scene: Phaser.Scene, catalog: IWorldCatalog): void;

  textureRef(
    entry: CatalogEntry,
    x: number,
    y: number,
    context?: AssetRenderContext,
  ): TextureRef;
}
